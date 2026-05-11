import { describe, it, expect } from 'vitest';
import { migrateV1TripToV2 } from './migration';

describe('migrateV1TripToV2', () => {
  it('renames departureDate/returnDate to portugalExit/portugalReturn', () => {
    const v1 = {
      id: 't1',
      departureDate: '2026-01-10',
      returnDate: '2026-01-15',
      destinationCountry: 'GB',
      status: 'past'
    };
    const v2 = migrateV1TripToV2(v1);
    expect(v2.portugalExitDate).toBe('2026-01-10');
    expect(v2.portugalReturnDate).toBe('2026-01-15');
    expect(v2.primaryDestinationCountry).toBe('GB');
    expect((v2 as unknown as Record<string, unknown>).departureDate).toBeUndefined();
    expect((v2 as unknown as Record<string, unknown>).returnDate).toBeUndefined();
    expect((v2 as unknown as Record<string, unknown>).destinationCountry).toBeUndefined();
  });

  it('converts single purpose to a purposes array', () => {
    const v1 = {
      id: 't1',
      departureDate: '2026-01-10',
      returnDate: '2026-01-15',
      destinationCountry: 'GB',
      status: 'past',
      purpose: 'business'
    };
    const v2 = migrateV1TripToV2(v1);
    expect(v2.purposes).toEqual(['business']);
    expect((v2 as unknown as Record<string, unknown>).purpose).toBeUndefined();
  });

  it('maps deprecated purposes cultural/social to tourism', () => {
    expect(
      migrateV1TripToV2({
        id: 't',
        departureDate: '2026-01-10',
        returnDate: '2026-01-15',
        destinationCountry: 'GB',
        status: 'past',
        purpose: 'cultural'
      }).purposes
    ).toEqual(['tourism']);

    expect(
      migrateV1TripToV2({
        id: 't',
        departureDate: '2026-01-10',
        returnDate: '2026-01-15',
        destinationCountry: 'GB',
        status: 'past',
        purpose: 'social'
      }).purposes
    ).toEqual(['tourism']);
  });

  it('omits purposes when v1 had no purpose', () => {
    const v2 = migrateV1TripToV2({
      id: 't',
      departureDate: '2026-01-10',
      returnDate: '2026-01-15',
      destinationCountry: 'GB',
      status: 'past'
    });
    expect(v2.purposes).toBeUndefined();
  });

  it('migrates city + airports into the notes field', () => {
    const v2 = migrateV1TripToV2({
      id: 't',
      departureDate: '2026-01-10',
      returnDate: '2026-01-15',
      destinationCountry: 'GB',
      destinationCity: 'London',
      departureAirport: 'LIS',
      arrivalAirport: 'LHR',
      status: 'past'
    });
    expect(v2.notes).toBe('City: London. From: LIS. To: LHR.');
    expect((v2 as unknown as Record<string, unknown>).destinationCity).toBeUndefined();
    expect((v2 as unknown as Record<string, unknown>).departureAirport).toBeUndefined();
    expect((v2 as unknown as Record<string, unknown>).arrivalAirport).toBeUndefined();
  });

  it('preserves and prepends to existing notes', () => {
    const v2 = migrateV1TripToV2({
      id: 't',
      departureDate: '2026-01-10',
      returnDate: '2026-01-15',
      destinationCountry: 'GB',
      destinationCity: 'London',
      status: 'past',
      notes: 'work conference'
    });
    expect(v2.notes).toBe('City: London. work conference');
  });

  it('passes through id, status, and needsReview', () => {
    const v2 = migrateV1TripToV2({
      id: 't42',
      departureDate: '2026-01-10',
      returnDate: '2026-01-15',
      destinationCountry: 'GB',
      status: 'planned',
      needsReview: true
    });
    expect(v2.id).toBe('t42');
    expect(v2.status).toBe('planned');
    expect(v2.needsReview).toBe(true);
  });

  it('does not set Schengen-specific fields on migrated trips', () => {
    const v2 = migrateV1TripToV2({
      id: 't',
      departureDate: '2026-01-10',
      returnDate: '2026-01-15',
      destinationCountry: 'TR',
      status: 'past'
    });
    expect(v2.schengenExitDate).toBeUndefined();
    expect(v2.schengenReturnDate).toBeUndefined();
    expect(v2.schengenExitLocation).toBeUndefined();
    expect(v2.schengenReturnLocation).toBeUndefined();
  });
});

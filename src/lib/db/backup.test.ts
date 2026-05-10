import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { TrackerDB, SCHEMA_VERSION } from './schema';
import { makeRepos } from './repositories';
import { exportToJSON, importFromJSON } from './backup';
import type { Card, Trip } from '../domain/types';

let db: TrackerDB;
let repos: ReturnType<typeof makeRepos>;

beforeEach(async () => {
  db = new TrackerDB('backup-db-' + Math.random().toString(36).slice(2));
  await db.open();
  repos = makeRepos(db);
});

describe('exportToJSON', () => {
  it('exports cards, trips, and settings', async () => {
    const card: Card = {
      id: 'c1',
      label: 'X',
      type: 'subsequent_3yr',
      issuedDate: '2025-08-01',
      expiryDate: '2028-01-31'
    };
    const trip: Trip = {
      id: 't1',
      departureDate: '2026-01-10',
      returnDate: '2026-01-15',
      destinationCountry: 'GB',
      status: 'past'
    };
    await repos.cards.put(card);
    await repos.trips.put(trip);

    const json = JSON.parse(await exportToJSON(repos));
    expect(json.schemaVersion).toBe(SCHEMA_VERSION);
    expect(json.cards).toHaveLength(1);
    expect(json.trips).toHaveLength(1);
    expect(json.exportedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});

describe('importFromJSON', () => {
  it('restores cards and trips, replacing existing data', async () => {
    const payload = {
      schemaVersion: 1,
      exportedAt: '2026-05-10T12:00:00Z',
      cards: [
        {
          id: 'c1',
          label: 'Restored',
          type: 'initial_2yr',
          issuedDate: '2024-01-01',
          expiryDate: '2026-01-01'
        }
      ],
      trips: [
        {
          id: 't1',
          departureDate: '2025-06-01',
          returnDate: '2025-06-05',
          destinationCountry: 'TR',
          status: 'past'
        }
      ],
      settings: { daycountConvention: 'inclusive_both', defaultScopeView: 'portugal' }
    };
    await importFromJSON(repos, JSON.stringify(payload));
    const cards = await repos.cards.list();
    const trips = await repos.trips.list();
    const settings = await repos.settings.get();
    expect(cards[0].label).toBe('Restored');
    expect(trips[0].destinationCountry).toBe('TR');
    expect(settings.daycountConvention).toBe('inclusive_both');
  });

  it('rejects mismatched schema versions', async () => {
    const payload = JSON.stringify({ schemaVersion: 999, cards: [], trips: [], settings: {} });
    await expect(importFromJSON(repos, payload)).rejects.toThrow(/schema version/i);
  });
});

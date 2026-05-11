import type { Trip, TripPurpose } from '../domain/types';

/**
 * Transform a v1 Trip row into a v2 Trip.
 * - Renames departureDate/returnDate/destinationCountry to v2 names.
 * - Converts single `purpose` to a `purposes` array; maps cultural/social → tourism.
 * - Folds destinationCity, departureAirport, arrivalAirport into `notes` (prepended).
 * - Leaves Schengen-specific fields undefined (existing v1 data has no transit info).
 *
 * Pure function: no side effects, deterministic.
 */
export function migrateV1TripToV2(row: Record<string, unknown>): Trip {
  const get = (k: string) => row[k];

  const purposeMap: Record<string, TripPurpose> = {
    cultural: 'tourism',
    social: 'tourism',
    business: 'business',
    work: 'work',
    personal: 'personal',
    medical: 'medical'
  };

  const oldPurpose = get('purpose') as string | undefined;
  const purposes: TripPurpose[] | undefined =
    oldPurpose && purposeMap[oldPurpose] ? [purposeMap[oldPurpose]] : undefined;

  const noteFragments: string[] = [];
  if (get('destinationCity')) noteFragments.push(`City: ${get('destinationCity')}`);
  if (get('departureAirport')) noteFragments.push(`From: ${get('departureAirport')}`);
  if (get('arrivalAirport')) noteFragments.push(`To: ${get('arrivalAirport')}`);

  const existingNotes = get('notes') as string | undefined;
  const combinedNotes =
    noteFragments.length > 0
      ? [noteFragments.join('. ') + '.', existingNotes].filter(Boolean).join(' ')
      : existingNotes;

  return {
    id: String(get('id')),
    status: get('status') as Trip['status'],
    needsReview: get('needsReview') as boolean | undefined,
    portugalExitDate: String(get('departureDate')),
    portugalReturnDate: String(get('returnDate')),
    primaryDestinationCountry: String(get('destinationCountry')),
    purposes,
    notes: combinedNotes
  };
}

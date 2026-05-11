import { SCHEMA_VERSION } from './schema';
import { migrateV1TripToV2 } from './migration';
import type { makeRepos } from './repositories';

export async function exportToJSON(repos: ReturnType<typeof makeRepos>): Promise<string> {
  const [cards, trips, settings] = await Promise.all([
    repos.cards.list(),
    repos.trips.list(),
    repos.settings.get()
  ]);
  return JSON.stringify(
    {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      cards,
      trips,
      settings
    },
    null,
    2
  );
}

export async function importFromJSON(
  repos: ReturnType<typeof makeRepos>,
  raw: string
): Promise<void> {
  const parsed = JSON.parse(raw);
  const incomingVersion = parsed.schemaVersion;

  if (incomingVersion !== 1 && incomingVersion !== SCHEMA_VERSION) {
    throw new Error(`Unsupported schema version: ${incomingVersion}`);
  }

  // Wipe existing rows
  const allCards = await repos.cards.list();
  for (const c of allCards) await repos.cards.delete(c.id);
  const allTrips = await repos.trips.list();
  for (const t of allTrips) await repos.trips.delete(t.id);

  // Cards: schema unchanged between v1 and v2, write as-is
  for (const c of parsed.cards ?? []) await repos.cards.put(c);

  // Trips: migrate if incoming is v1
  for (const t of parsed.trips ?? []) {
    const v2Trip = incomingVersion === 1 ? migrateV1TripToV2(t) : t;
    await repos.trips.put(v2Trip);
  }

  if (parsed.settings) await repos.settings.update(parsed.settings);
  await repos.settings.update({ lastBackupAt: new Date().toISOString() });
}

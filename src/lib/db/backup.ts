import { SCHEMA_VERSION } from './schema';
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
  if (parsed.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Unsupported schema version: ${parsed.schemaVersion}`);
  }
  const allCards = await repos.cards.list();
  for (const c of allCards) await repos.cards.delete(c.id);
  const allTrips = await repos.trips.list();
  for (const t of allTrips) await repos.trips.delete(t.id);
  for (const c of parsed.cards ?? []) await repos.cards.put(c);
  for (const t of parsed.trips ?? []) await repos.trips.put(t);
  if (parsed.settings) await repos.settings.update(parsed.settings);
  await repos.settings.update({ lastBackupAt: new Date().toISOString() });
}

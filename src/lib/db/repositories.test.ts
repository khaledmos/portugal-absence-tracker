import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { TrackerDB } from './schema';
import { makeRepos } from './repositories';
import type { Card, Trip } from '../domain/types';

let db: TrackerDB;
let repos: ReturnType<typeof makeRepos>;

beforeEach(async () => {
  db = new TrackerDB('test-db-' + Math.random().toString(36).slice(2));
  await db.open();
  repos = makeRepos(db);
});

describe('CardRepo', () => {
  it('creates and retrieves a card', async () => {
    const card: Card = {
      id: 'c1',
      label: 'Card 1',
      type: 'subsequent_3yr',
      issuedDate: '2025-08-01',
      expiryDate: '2028-01-31'
    };
    await repos.cards.put(card);
    const list = await repos.cards.list();
    expect(list).toHaveLength(1);
    expect(list[0].label).toBe('Card 1');
  });

  it('returns the active card for today', async () => {
    const c1: Card = {
      id: 'c1',
      label: 'old',
      type: 'initial_2yr',
      issuedDate: '2023-07-15',
      expiryDate: '2025-07-14'
    };
    const c2: Card = {
      id: 'c2',
      label: 'new',
      type: 'subsequent_3yr',
      issuedDate: '2025-08-01',
      expiryDate: '2028-01-31'
    };
    await repos.cards.put(c1);
    await repos.cards.put(c2);
    const active = await repos.cards.activeAt('2026-05-10');
    expect(active?.id).toBe('c2');
  });

  it('returns null when no card is active', async () => {
    const c: Card = {
      id: 'c1',
      label: 'old',
      type: 'initial_2yr',
      issuedDate: '2020-01-01',
      expiryDate: '2022-01-01'
    };
    await repos.cards.put(c);
    expect(await repos.cards.activeAt('2026-05-10')).toBeNull();
  });
});

describe('TripRepo', () => {
  it('creates, lists, and deletes trips', async () => {
    const t: Trip = {
      id: 't1',
      portugalExitDate: '2026-01-10',
      portugalReturnDate: '2026-01-15',
      primaryDestinationCountry: 'GB',
      status: 'past'
    };
    await repos.trips.put(t);
    expect(await repos.trips.list()).toHaveLength(1);
    await repos.trips.delete('t1');
    expect(await repos.trips.list()).toHaveLength(0);
  });

  it('lists planned trips with past return dates', async () => {
    const overdue: Trip = {
      id: 'o',
      portugalExitDate: '2026-04-01',
      portugalReturnDate: '2026-04-10',
      primaryDestinationCountry: 'GB',
      status: 'planned'
    };
    const future: Trip = {
      id: 'f',
      portugalExitDate: '2026-12-01',
      portugalReturnDate: '2026-12-10',
      primaryDestinationCountry: 'GB',
      status: 'planned'
    };
    await repos.trips.put(overdue);
    await repos.trips.put(future);
    const overdueOnes = await repos.trips.plannedOverdue('2026-05-10');
    expect(overdueOnes.map((t) => t.id)).toEqual(['o']);
  });
});

describe('SettingsRepo', () => {
  it('returns defaults when no settings stored', async () => {
    const s = await repos.settings.get();
    expect(s.daycountConvention).toBe('standard');
    expect(s.defaultScopeView).toBe('both');
  });

  it('persists updates', async () => {
    await repos.settings.update({ daycountConvention: 'inclusive_both' });
    const s = await repos.settings.get();
    expect(s.daycountConvention).toBe('inclusive_both');
  });
});

describe('Dexie v1 → v2 upgrade', () => {
  it('migrates an existing v1 database in place', async () => {
    const dbName = 'upgrade-test-' + Math.random().toString(36).slice(2);

    // Step 1: open the v1 schema and insert a v1-shaped trip
    const Dexie = (await import('dexie')).default;
    const v1Db = new Dexie(dbName);
    v1Db.version(1).stores({
      cards: 'id, issuedDate, expiryDate, archived',
      trips: 'id, departureDate, returnDate, status, destinationCountry',
      settings: 'id'
    });
    await v1Db.open();
    await v1Db.table('trips').put({
      id: 'legacy-1',
      departureDate: '2025-11-04',
      returnDate: '2025-11-12',
      destinationCountry: 'GB',
      destinationCity: 'London',
      departureAirport: 'LIS',
      arrivalAirport: 'LHR',
      status: 'past',
      purpose: 'cultural'
    });
    v1Db.close();

    // Step 2: reopen with v2 schema — upgrade runs
    const v2Db = new TrackerDB(dbName);
    await v2Db.open();
    const migrated = await v2Db.trips.get('legacy-1');
    expect(migrated).toBeTruthy();
    expect(migrated?.portugalExitDate).toBe('2025-11-04');
    expect(migrated?.portugalReturnDate).toBe('2025-11-12');
    expect(migrated?.primaryDestinationCountry).toBe('GB');
    expect(migrated?.purposes).toEqual(['tourism']);
    expect(migrated?.notes).toBe('City: London. From: LIS. To: LHR.');
    expect((migrated as unknown as Record<string, unknown>).departureDate).toBeUndefined();
    v2Db.close();
  });
});

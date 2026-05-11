import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { TrackerDB } from '../db/schema';
import { makeRepos } from '../db/repositories';
import { autoFlipOverdue } from './data.svelte';
import type { Trip } from '../domain/types';

let db: TrackerDB;
let repos: ReturnType<typeof makeRepos>;

beforeEach(async () => {
  db = new TrackerDB('autoflip-' + Math.random().toString(36).slice(2));
  await db.open();
  repos = makeRepos(db);
});

describe('autoFlipOverdue', () => {
  it('flips planned → past with needsReview when return date has passed', async () => {
    const t: Trip = {
      id: 't1',
      portugalExitDate: '2026-04-01',
      portugalReturnDate: '2026-04-10',
      primaryDestinationCountry: 'GB',
      status: 'planned'
    };
    await repos.trips.put(t);
    const flipped = await autoFlipOverdue(repos, '2026-05-10');
    expect(flipped).toBe(1);
    const updated = await repos.trips.get('t1');
    expect(updated?.status).toBe('past');
    expect(updated?.needsReview).toBe(true);
  });

  it('does not flip same-day returns (1-day buffer)', async () => {
    const t: Trip = {
      id: 't1',
      portugalExitDate: '2026-05-09',
      portugalReturnDate: '2026-05-10',
      primaryDestinationCountry: 'GB',
      status: 'planned'
    };
    await repos.trips.put(t);
    const flipped = await autoFlipOverdue(repos, '2026-05-10');
    expect(flipped).toBe(0);
  });

  it('does not touch already-past trips', async () => {
    const t: Trip = {
      id: 't1',
      portugalExitDate: '2026-04-01',
      portugalReturnDate: '2026-04-10',
      primaryDestinationCountry: 'GB',
      status: 'past'
    };
    await repos.trips.put(t);
    const flipped = await autoFlipOverdue(repos, '2026-05-10');
    expect(flipped).toBe(0);
  });
});

import { addDays, format, parseISO } from 'date-fns';
import { db } from '../db/schema';
import { makeRepos } from '../db/repositories';
import type { Card, ISODate, Settings, Trip } from '../domain/types';

export const repos = makeRepos(db);

export function todayISO(): ISODate {
  return format(new Date(), 'yyyy-MM-dd');
}

export async function autoFlipOverdue(
  r: ReturnType<typeof makeRepos>,
  today: ISODate
): Promise<number> {
  const cutoff = format(addDays(parseISO(today), -1), 'yyyy-MM-dd');
  const overdue = await r.trips.list();
  let count = 0;
  for (const t of overdue) {
    if (t.status === 'planned' && t.portugalReturnDate <= cutoff) {
      await r.trips.put({ ...t, status: 'past', needsReview: true });
      count++;
    }
  }
  return count;
}

class DataStore {
  cards = $state<Card[]>([]);
  trips = $state<Trip[]>([]);
  settings = $state<Settings>({ daycountConvention: 'standard', defaultScopeView: 'both' });
  loaded = $state(false);

  async load() {
    const [cards, trips, settings] = await Promise.all([
      repos.cards.list(),
      repos.trips.list(),
      repos.settings.get()
    ]);
    this.cards = cards;
    this.trips = trips;
    this.settings = settings;
    this.loaded = true;
  }

  async refresh() {
    await this.load();
  }

  async upsertCard(card: Card) {
    await repos.cards.put(card);
    await this.refresh();
  }

  async deleteCard(id: string) {
    await repos.cards.delete(id);
    await this.refresh();
  }

  async upsertTrip(trip: Trip) {
    await repos.trips.put(trip);
    await this.refresh();
  }

  async deleteTrip(id: string) {
    await repos.trips.delete(id);
    await this.refresh();
  }

  async updateSettings(patch: Partial<Settings>) {
    this.settings = await repos.settings.update(patch);
  }
}

export const data = new DataStore();

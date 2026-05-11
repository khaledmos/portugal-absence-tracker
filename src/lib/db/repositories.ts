import type { TrackerDB } from './schema';
import type { Card, Trip, Settings, ISODate } from '../domain/types';

const DEFAULT_SETTINGS: Settings = {
  daycountConvention: 'standard',
  defaultScopeView: 'both'
};

export class CardRepo {
  constructor(private db: TrackerDB) {}
  list = () => this.db.cards.toArray();
  get = (id: string) => this.db.cards.get(id);
  put = (card: Card) => this.db.cards.put(card);
  delete = (id: string) => this.db.cards.delete(id);
  async activeAt(today: ISODate): Promise<Card | null> {
    const all = await this.list();
    return all.find((c) => !c.archived && c.issuedDate <= today && today <= c.expiryDate) ?? null;
  }
}

export class TripRepo {
  constructor(private db: TrackerDB) {}
  list = () => this.db.trips.orderBy('portugalExitDate').toArray();
  get = (id: string) => this.db.trips.get(id);
  put = (trip: Trip) => this.db.trips.put(trip);
  delete = (id: string) => this.db.trips.delete(id);
  async plannedOverdue(today: ISODate): Promise<Trip[]> {
    const all = await this.list();
    return all.filter((t) => t.status === 'planned' && t.portugalReturnDate < today);
  }
}

export class SettingsRepo {
  constructor(private db: TrackerDB) {}
  async get(): Promise<Settings> {
    const row = await this.db.settings.get('singleton');
    return row?.value ?? { ...DEFAULT_SETTINGS };
  }
  async update(patch: Partial<Settings>): Promise<Settings> {
    const current = await this.get();
    const next = { ...current, ...patch };
    await this.db.settings.put({ id: 'singleton', value: next });
    return next;
  }
}

export function makeRepos(db: TrackerDB) {
  return {
    cards: new CardRepo(db),
    trips: new TripRepo(db),
    settings: new SettingsRepo(db)
  };
}

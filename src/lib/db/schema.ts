import Dexie, { type Table } from 'dexie';
import type { Card, Trip, Settings } from '../domain/types';

export const SCHEMA_VERSION = 1;

export class TrackerDB extends Dexie {
  cards!: Table<Card, string>;
  trips!: Table<Trip, string>;
  settings!: Table<{ id: string; value: Settings }, string>;

  constructor(name = 'pt-residence-tracker') {
    super(name);
    this.version(1).stores({
      cards: 'id, issuedDate, expiryDate, archived',
      trips: 'id, departureDate, returnDate, status, destinationCountry',
      settings: 'id'
    });
  }
}

export const db = new TrackerDB();

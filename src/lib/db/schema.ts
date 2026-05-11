import Dexie, { type Table } from 'dexie';
import type { Card, Trip, Settings } from '../domain/types';
import { migrateV1TripToV2 } from './migration';

export const SCHEMA_VERSION = 2;

export class TrackerDB extends Dexie {
  cards!: Table<Card, string>;
  trips!: Table<Trip, string>;
  settings!: Table<{ id: string; value: Settings }, string>;

  constructor(name = 'pt-residence-tracker') {
    super(name);

    // v1 (shipped 2026-05-11)
    this.version(1).stores({
      cards: 'id, issuedDate, expiryDate, archived',
      trips: 'id, departureDate, returnDate, status, destinationCountry',
      settings: 'id'
    });

    // v2 (2026-05-12): rename Trip fields, add Schengen sub-interval, multi-purpose.
    this.version(2)
      .stores({
        cards: 'id, issuedDate, expiryDate, archived',
        trips: 'id, portugalExitDate, portugalReturnDate, status, primaryDestinationCountry',
        settings: 'id'
      })
      .upgrade((tx) => {
        return tx
          .table('trips')
          .toCollection()
          .modify((t: Record<string, unknown>) => {
            const migrated = migrateV1TripToV2(t);
            for (const key of Object.keys(t)) delete t[key];
            Object.assign(t, migrated);
          });
      });
  }
}

export const db = new TrackerDB();

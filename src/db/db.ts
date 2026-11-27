import Dexie, { type Table } from 'dexie';
import type { Employer, Entry } from '../domain/types';

export interface SettingRow {
  key: string;
  value: unknown;
}

class BoliDB extends Dexie {
  entries!: Table<Entry, string>;
  employers!: Table<Employer, string>;
  settings!: Table<SettingRow, string>;

  constructor() {
    super('bolihisab');
    this.version(1).stores({
      entries: 'id, employerId, date',
      employers: 'id, name',
      settings: 'key',
    });
  }
}

export const db = new BoliDB();

export const newId = () => crypto.randomUUID();

export async function addEntry(e: Entry): Promise<void> {
  await db.entries.put(e);
}

export async function listEntries(): Promise<Entry[]> {
  return db.entries.toArray();
}

export async function listEmployers(): Promise<Employer[]> {
  return db.employers.toArray();
}

export async function findOrCreateEmployer(name: string): Promise<Employer> {
  const clean = name.trim();
  const existing = (await db.employers.toArray()).find(
    (e) => e.name.toLowerCase() === clean.toLowerCase(),
  );
  if (existing) return existing;
  const created: Employer = { id: newId(), name: clean };
  await db.employers.put(created);
  return created;
}

/** Marks an entry as confirmed by the employer. No-op for an unknown id. */
export async function confirmByEmployer(id: string): Promise<void> {
  await db.entries.update(id, { source: 'employer_confirmed' });
}

/** Changes amount and date. An edit voids any employer confirmation, so it goes back to worker-recorded. */
export async function updateEntry(id: string, patch: { amount: number; date: string }): Promise<void> {
  await db.entries.update(id, { amount: patch.amount, date: patch.date, source: 'worker' });
}

export async function deleteEntry(id: string): Promise<void> {
  await db.entries.delete(id);
}

/** Removes only demo-mode rows; real records are never touched. */
export async function clearDemoData(): Promise<void> {
  const entryIds = await db.entries.filter((e) => e.demo === true).primaryKeys();
  const employerIds = await db.employers.filter((e) => e.demo === true).primaryKeys();
  await db.entries.bulkDelete(entryIds);
  await db.employers.bulkDelete(employerIds);
}

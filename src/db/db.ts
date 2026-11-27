import Dexie, { type Table } from 'dexie';
import type { Employer, Entry } from '../domain/types';

export interface SettingRow {
  key: string;
  value: unknown;
}

/** The worker's own recording behind an entry ("voice proof"). Stored only on this device. */
export interface Clip {
  id: string;
  blob: Blob;
  mime: string;
  durationMs: number;
  createdAt: number;
  demo?: boolean;
}

class BoliDB extends Dexie {
  entries!: Table<Entry, string>;
  employers!: Table<Employer, string>;
  settings!: Table<SettingRow, string>;
  clips!: Table<Clip, string>;

  constructor() {
    super('bolihisab');
    this.version(1).stores({
      entries: 'id, employerId, date',
      employers: 'id, name',
      settings: 'key',
    });
    // v2: voice proof clips. Existing rows are kept as they are.
    this.version(2).stores({
      entries: 'id, employerId, date, clipId',
      employers: 'id, name',
      settings: 'key',
      clips: 'id',
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

/** Deletes an entry, and its voice clip once no other entry (another day of the same sentence) uses it. */
export async function deleteEntry(id: string): Promise<void> {
  const entry = await db.entries.get(id);
  await db.entries.delete(id);
  if (entry?.clipId && (await db.entries.where('clipId').equals(entry.clipId).count()) === 0) {
    await db.clips.delete(entry.clipId);
  }
}

export async function saveClip(blob: Blob, durationMs: number, opts: { demo?: boolean } = {}): Promise<string> {
  const id = newId();
  await db.clips.put({ id, blob, mime: blob.type || 'audio/webm', durationMs, createdAt: Date.now(), ...(opts.demo ? { demo: true } : {}) });
  return id;
}

export const getClip = (id: string): Promise<Clip | undefined> => db.clips.get(id);

/** Removes only demo-mode rows; real records are never touched. */
export async function clearDemoData(): Promise<void> {
  const entryIds = await db.entries.filter((e) => e.demo === true).primaryKeys();
  const employerIds = await db.employers.filter((e) => e.demo === true).primaryKeys();
  const clipIds = await db.clips.filter((c) => c.demo === true).primaryKeys();
  await db.entries.bulkDelete(entryIds);
  await db.employers.bulkDelete(employerIds);
  await db.clips.bulkDelete(clipIds);
}

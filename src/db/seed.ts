import type { Employer, Entry } from '../domain/types';
import { localISODate } from '../domain/dates';
import { clearDemoData, db, newId } from './db';

const isoDaysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localISODate(d);
};

/**
 * Replaces any previous demo data with a small sample ledger (Ramesh: 3 work days, 1 advance).
 * Rows are flagged `demo` so they never mix with, or overwrite, real records.
 * Pass `{ demo: false }` to create ordinary rows (used by tests).
 */
export async function seedDemoData(opts: { demo?: boolean } = {}): Promise<void> {
  const demo = opts.demo ?? true;
  await clearDemoData();
  const ramesh: Employer = { id: newId(), name: 'Ramesh', dailyRate: 700, overtimeRate: 100, ...(demo ? { demo } : {}) };
  await db.employers.put(ramesh);
  const base = {
    employerId: ramesh.id,
    source: 'worker' as const,
    rawTranscript: '(demo)',
    lang: 'en-IN' as const,
    ...(demo ? { demo } : {}),
  };
  const rows: Entry[] = [
    { ...base, id: newId(), type: 'work', amount: 700, date: isoDaysAgo(3), createdAt: Date.now() },
    { ...base, id: newId(), type: 'work', amount: 700, date: isoDaysAgo(2), createdAt: Date.now() },
    { ...base, id: newId(), type: 'work', amount: 700, date: isoDaysAgo(1), createdAt: Date.now() },
    { ...base, id: newId(), type: 'advance', amount: 1000, date: isoDaysAgo(1), createdAt: Date.now() },
  ];
  await db.entries.bulkPut(rows);
}

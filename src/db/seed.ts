import type { Entry } from '../domain/types';
import { db, newId } from './db';

const isoDaysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

/** Replaces all data with a small labelled demo ledger. */
export async function seedDemoData(): Promise<void> {
  await db.entries.clear();
  await db.employers.clear();
  const ramesh = { id: newId(), name: 'Ramesh', dailyRate: 700, overtimeRate: 100 };
  await db.employers.put(ramesh);
  const base = { employerId: ramesh.id, source: 'worker' as const, rawTranscript: '(demo)', lang: 'en-IN' as const };
  const rows: Entry[] = [
    { ...base, id: newId(), type: 'work', amount: 700, date: isoDaysAgo(3), createdAt: Date.now() },
    { ...base, id: newId(), type: 'work', amount: 700, date: isoDaysAgo(2), createdAt: Date.now() },
    { ...base, id: newId(), type: 'work', amount: 700, date: isoDaysAgo(1), createdAt: Date.now() },
    { ...base, id: newId(), type: 'advance', amount: 1000, date: isoDaysAgo(1), createdAt: Date.now() },
  ];
  await db.entries.bulkPut(rows);
}

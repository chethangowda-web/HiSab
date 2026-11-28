import type { Employer, Entry } from '../domain/types';
import { localISODate } from '../domain/dates';
import { db, newId } from './db';

const isoDaysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localISODate(d);
};

/** Test fixture: a small ledger (Ramesh: 3 work days, 1 advance). Not used by the app itself. */
export async function seedSampleLedger(): Promise<void> {
  const ramesh: Employer = { id: newId(), name: 'Ramesh', dailyRate: 700, overtimeRate: 100 };
  await db.employers.put(ramesh);
  const base = { employerId: ramesh.id, source: 'worker' as const, rawTranscript: '(sample)', lang: 'en-IN' as const };
  const rows: Entry[] = [
    { ...base, id: newId(), type: 'work', amount: 700, date: isoDaysAgo(3), createdAt: Date.now() },
    { ...base, id: newId(), type: 'work', amount: 700, date: isoDaysAgo(2), createdAt: Date.now() },
    { ...base, id: newId(), type: 'work', amount: 700, date: isoDaysAgo(1), createdAt: Date.now() },
    { ...base, id: newId(), type: 'advance', amount: 1000, date: isoDaysAgo(1), createdAt: Date.now() },
  ];
  await db.entries.bulkPut(rows);
}

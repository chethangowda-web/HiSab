import { describe, it, expect, beforeEach } from 'vitest';
import type { Employer, Entry } from '../src/domain/types';
import { answerQuery } from '../src/domain/queries';
import { db, addEntry, listEntries, listEmployers, findOrCreateEmployer } from '../src/db/db';
import { seedSampleLedger } from '../src/db/seed';

const emp = (id: string, name: string): Employer => ({ id, name });
const ent = (p: Partial<Entry>): Entry => ({
  id: Math.random().toString(36),
  employerId: 'r1',
  type: 'work',
  amount: 0,
  date: '2026-11-25',
  source: 'worker',
  rawTranscript: '',
  lang: 'en-IN',
  createdAt: 0,
  ...p,
});

const employers = [emp('r1', 'Ramesh'), emp('s1', 'Suresh')];
const entries = [
  ent({ amount: 700, date: '2026-11-25' }),
  ent({ amount: 700, date: '2026-11-26' }),
  ent({ type: 'advance', amount: 1000 }),
  ent({ type: 'payment', amount: 200 }),
  ent({ employerId: 's1', amount: 900, date: '2026-10-02' }),
];
const today = '2026-11-27';

describe('answerQuery', () => {
  it('owed for a named employer', () => {
    expect(answerQuery({ kind: 'query', q: 'owed', employerName: 'Ramesh' }, entries, employers, today))
      .toEqual({ key: 'owed', amount: 200, employerName: 'Ramesh' });
  });
  it('name match is case-insensitive', () => {
    expect(answerQuery({ kind: 'query', q: 'owed', employerName: 'ramesh' }, entries, employers, today).amount).toBe(200);
  });
  it('unknown employer', () => {
    expect(answerQuery({ kind: 'query', q: 'owed', employerName: 'Mahesh' }, entries, employers, today).key)
      .toBe('unknown_employer');
  });
  it('ambiguous employer when two share a first name', () => {
    const two = [emp('a', 'Ramesh Kumar'), emp('b', 'Ramesh Gowda')];
    expect(answerQuery({ kind: 'query', q: 'owed', employerName: 'Ramesh' }, [], two, today).key)
      .toBe('ambiguous_employer');
  });
  it('exact name beats prefix match', () => {
    const two = [emp('a', 'Ramesh'), emp('b', 'Ramesh Gowda')];
    expect(answerQuery({ kind: 'query', q: 'owed', employerName: 'Ramesh' }, [], two, today).key).toBe('owed');
  });
  it('owed with no employer sums all balances', () => {
    expect(answerQuery({ kind: 'query', q: 'owed' }, entries, employers, today).amount).toBe(1100);
  });
  it('earned this month uses today month only', () => {
    expect(answerQuery({ kind: 'query', q: 'earned', period: 'month' }, entries, employers, today))
      .toMatchObject({ key: 'earned', amount: 1400 });
  });
  it('advances and days', () => {
    expect(answerQuery({ kind: 'query', q: 'advances', employerName: 'Ramesh' }, entries, employers, today).amount).toBe(1000);
    expect(answerQuery({ kind: 'query', q: 'days', employerName: 'Ramesh' }, entries, employers, today).amount).toBe(2);
  });
});

describe('db', () => {
  beforeEach(async () => {
    await db.entries.clear();
    await db.employers.clear();
  });
  it('addEntry then listEntries returns it', async () => {
    const x = ent({ amount: 700 });
    await addEntry(x);
    expect(await listEntries()).toEqual([x]);
  });
  it('findOrCreateEmployer reuses an existing name case-insensitively', async () => {
    const a = await findOrCreateEmployer('Ramesh');
    const b = await findOrCreateEmployer('ramesh');
    expect(b.id).toBe(a.id);
    expect(await listEmployers()).toHaveLength(1);
  });
  it('seedSampleLedger creates Ramesh with 3 work days and 1 advance', async () => {
    await seedSampleLedger();
    const es = await listEntries();
    expect(es.filter((x) => x.type === 'work')).toHaveLength(3);
    expect(es.filter((x) => x.type === 'advance')).toHaveLength(1);
    expect((await listEmployers()).map((x) => x.name)).toEqual(['Ramesh']);
  });
});

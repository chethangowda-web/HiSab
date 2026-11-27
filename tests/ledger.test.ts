import { describe, it, expect } from 'vitest';
import type { Entry } from '../src/domain/types';
import { balance, daysWorked, earned, totals, overtimeAmount } from '../src/domain/ledger';

let n = 0;
const e = (p: Partial<Entry>): Entry => ({
  id: `e${n++}`,
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

const entries: Entry[] = [
  e({ type: 'work', amount: 700, date: '2026-11-25' }),
  e({ type: 'work', amount: 700, date: '2026-11-26' }),
  e({ type: 'advance', amount: 1000, date: '2026-11-26' }),
  e({ type: 'payment', amount: 200, date: '2026-11-27' }),
  // another employer must not leak into r1
  e({ employerId: 'r2', type: 'work', amount: 5000, date: '2026-11-26' }),
];

describe('ledger', () => {
  it('balance = work+overtime - advances - payments', () => {
    expect(balance(entries, 'r1')).toBe(200);
  });
  it('balance is isolated per employer', () => {
    expect(balance(entries, 'r2')).toBe(5000);
  });
  it('daysWorked counts distinct work dates', () => {
    expect(daysWorked(entries, 'r1')).toBe(2);
    const dup = [...entries, e({ type: 'work', amount: 100, date: '2026-11-25' })];
    expect(daysWorked(dup, 'r1')).toBe(2);
  });
  it('daysWorked ignores non-work entries', () => {
    expect(daysWorked([e({ type: 'advance', amount: 10 })], 'r1')).toBe(0);
  });
  it('totals breaks down the ledger', () => {
    expect(totals(entries, 'r1')).toEqual({ earned: 1400, advances: 1000, payments: 200, outstanding: 200 });
  });
  it('balance can go negative when advances exceed earnings', () => {
    expect(balance([e({ type: 'advance', amount: 500 })], 'r1')).toBe(-500);
  });
  it('earned filters by month', () => {
    expect(earned(entries, { employerId: 'r1', month: '2026-11' })).toBe(1400);
    expect(earned(entries, { employerId: 'r1', month: '2026-10' })).toBe(0);
  });
  it('earned without employer sums everyone', () => {
    expect(earned(entries, { month: '2026-11' })).toBe(6400);
  });
  it('overtime counts as earnings', () => {
    expect(earned([e({ type: 'overtime', amount: 150 })], { employerId: 'r1' })).toBe(150);
  });
  it('overtimeAmount is an integer', () => {
    expect(overtimeAmount(2, 75)).toBe(150);
    expect(overtimeAmount(1.5, 75)).toBe(113);
  });
});

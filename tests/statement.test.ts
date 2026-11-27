import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Employer, Entry } from '../src/domain/types';
import { buildStatementRows, buildSummaryText, shareSummary } from '../src/domain/statement';
import { validateEdit } from '../src/domain/edit';
import { db, addEntry, listEntries, listEmployers, confirmByEmployer, deleteEntry, updateEntry, clearDemoData } from '../src/db/db';
import { seedDemoData } from '../src/db/seed';
import { balance } from '../src/domain/ledger';

const ramesh: Employer = { id: 'r1', name: 'Ramesh' };
let n = 0;
const e = (p: Partial<Entry>): Entry => ({
  id: `s${n++}`,
  employerId: 'r1',
  type: 'work',
  amount: 0,
  date: '2026-11-25',
  source: 'worker',
  rawTranscript: '',
  lang: 'en-IN',
  createdAt: n,
  ...p,
});

const fixture: Entry[] = [
  e({ type: 'payment', amount: 200, date: '2026-11-27' }),
  e({ type: 'work', amount: 700, date: '2026-11-25', source: 'employer_confirmed' }),
  e({ type: 'advance', amount: 1000, date: '2026-11-26' }),
  e({ type: 'work', amount: 700, date: '2026-11-26' }),
  e({ type: 'overtime', amount: 150, hours: 2, date: '2026-11-26' }),
  e({ employerId: 'other', type: 'work', amount: 9999, date: '2026-11-26' }),
];

describe('buildStatementRows', () => {
  const { rows, totals } = buildStatementRows(fixture, ramesh, 'en-IN');

  it('has one row per entry of that employer only, oldest first', () => {
    expect(rows).toHaveLength(5);
    const dates = rows.map((r) => r[0]);
    expect([...dates].sort()).toEqual(dates);
    expect(rows.flat().join(' ')).not.toContain('9,999');
  });
  it('labels who recorded each entry', () => {
    expect(rows.filter((r) => r[3] === 'Employer-confirmed')).toHaveLength(1);
    expect(rows.filter((r) => r[3] === 'Worker-recorded')).toHaveLength(4);
  });
  it('shows type, hours and rupee amounts', () => {
    expect(rows.find((r) => r[1].startsWith('overtime'))).toEqual(['2026-11-26', 'overtime · 2h', '₹150', 'Worker-recorded']);
  });
  it('totals: earned 1550, advances 1000, payments 200, outstanding 350', () => {
    expect(totals).toEqual({ earned: 1550, advances: 1000, payments: 200, outstanding: 350 });
  });
  it('uses the chosen language for labels', () => {
    const hi = buildStatementRows(fixture, ramesh, 'hi-IN').rows;
    expect(hi[0][3]).toMatch(/[ऀ-ॿ]/);
  });
});

describe('buildSummaryText', () => {
  it('summarises employer, worker, totals and outstanding', () => {
    const text = buildSummaryText(fixture, ramesh, 'en-IN', 'Chethan');
    expect(text).toContain('Ramesh');
    expect(text).toContain('Chethan');
    expect(text).toContain('₹350');
    expect(text).toContain('₹1,550');
  });
  it('works without a worker name', () => {
    expect(buildSummaryText(fixture, ramesh, 'en-IN', '')).toContain('Ramesh');
  });
  it('keeps Kannada employer names intact', () => {
    const emp = { id: 'k', name: 'ರಮೇಶ್' };
    const text = buildSummaryText([e({ employerId: 'k', amount: 500 })], emp, 'kn-IN', '');
    expect(text).toContain('ರಮೇಶ್');
  });
});

describe('shareSummary', () => {
  const nav = navigator as unknown as Record<string, unknown>;
  afterEach(() => {
    delete nav.share;
    vi.restoreAllMocks();
  });

  it('uses the native share sheet when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    nav.share = share;
    expect(await shareSummary('hello', 'Title')).toBe('shared');
    expect(share).toHaveBeenCalledWith({ title: 'Title', text: 'hello' });
  });
  it('treats a dismissed share sheet as cancelled, not an error', async () => {
    nav.share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }));
    expect(await shareSummary('hello', 'Title')).toBe('cancelled');
  });
  it('opens WhatsApp with the encoded text when there is no share sheet', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    expect(await shareSummary('Ramesh owes ₹350', 'Title')).toBe('whatsapp');
    expect(open).toHaveBeenCalledWith(`https://wa.me/?text=${encodeURIComponent('Ramesh owes ₹350')}`, '_blank', 'noopener');
  });
});

describe('validateEdit', () => {
  const today = '2026-11-27';
  it('accepts a good edit', () => {
    expect(validateEdit({ amount: 800, date: '2026-11-26' }, today)).toEqual({ ok: true });
  });
  it.each([0, -1, 100000, 12.5, Number.NaN])('rejects amount %s', (amount) => {
    expect(validateEdit({ amount, date: today }, today)).toEqual({ ok: false, reason: 'bad_amount' });
  });
  it('rejects a future date', () => {
    expect(validateEdit({ amount: 800, date: '2026-11-28' }, today)).toEqual({ ok: false, reason: 'future_date' });
  });
  it.each(['', 'yesterday', '2026-13-01', '2026-02-31', '26-11-2026'])('rejects bad date %j', (date) => {
    expect(validateEdit({ amount: 800, date }, today)).toEqual({ ok: false, reason: 'bad_date' });
  });
});

describe('editing the ledger', () => {
  beforeEach(async () => {
    await db.entries.clear();
    await db.employers.clear();
  });

  it('confirmByEmployer marks the entry employer-confirmed', async () => {
    await addEntry(e({ id: 'x1', amount: 700 }));
    await confirmByEmployer('x1');
    expect((await listEntries())[0].source).toBe('employer_confirmed');
  });

  it('updateEntry changes amount and date and drops any employer confirmation', async () => {
    await addEntry(e({ id: 'x2', amount: 700, source: 'employer_confirmed' }));
    await updateEntry('x2', { amount: 800, date: '2026-11-20' });
    expect((await listEntries())[0]).toMatchObject({ amount: 800, date: '2026-11-20', source: 'worker' });
  });

  it('deleteEntry removes it and changes the balance', async () => {
    await addEntry(e({ id: 'x3', amount: 700 }));
    await addEntry(e({ id: 'x4', amount: 300 }));
    expect(balance(await listEntries(), 'r1')).toBe(1000);
    await deleteEntry('x3');
    expect(balance(await listEntries(), 'r1')).toBe(300);
  });

  it('editing a missing id does nothing and does not throw', async () => {
    await expect(updateEntry('nope', { amount: 1, date: '2026-11-20' })).resolves.toBeUndefined();
    await expect(confirmByEmployer('nope')).resolves.toBeUndefined();
    await expect(deleteEntry('nope')).resolves.toBeUndefined();
  });
});

describe('demo data is separate from real data', () => {
  beforeEach(async () => {
    await db.entries.clear();
    await db.employers.clear();
  });

  it('seeding demo data never touches real rows', async () => {
    await addEntry(e({ id: 'real1', amount: 500 }));
    await db.employers.put({ id: 'r1', name: 'Real Employer' });
    await seedDemoData();
    const entries = await listEntries();
    expect(entries.find((x) => x.id === 'real1')?.demo).toBeUndefined();
    expect(entries.filter((x) => x.demo)).toHaveLength(4);
    expect((await listEmployers()).find((x) => x.id === 'r1')?.name).toBe('Real Employer');
  });

  it('seeding twice does not duplicate the demo data', async () => {
    await seedDemoData();
    await seedDemoData();
    expect((await listEntries()).filter((x) => x.demo)).toHaveLength(4);
    expect((await listEmployers()).filter((x) => x.demo)).toHaveLength(1);
  });

  it('clearDemoData removes only demo rows', async () => {
    await addEntry(e({ id: 'real2', amount: 500 }));
    await seedDemoData();
    await clearDemoData();
    expect((await listEntries()).map((x) => x.id)).toEqual(['real2']);
    expect(await listEmployers()).toHaveLength(0);
  });

  it('seedDemoData({demo:false}) creates ordinary rows (used by tests)', async () => {
    await seedDemoData({ demo: false });
    expect((await listEntries()).every((x) => !x.demo)).toBe(true);
  });
});

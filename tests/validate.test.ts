import { describe, it, expect } from 'vitest';
import { validateDraft } from '../src/nlu/validate';

const today = '2026-11-27';

describe('validateDraft', () => {
  it('accepts a good draft', () => {
    expect(validateDraft({ type: 'work', amount: 700, date: today }, 'I worked for 700 rupees', today)).toEqual({ ok: true });
  });
  it('rejects a missing amount', () => {
    expect(validateDraft({ type: 'work', date: today }, 'I worked today', today)).toEqual({ ok: false, reason: 'no_amount' });
  });
  it.each([0, 100000, -5, 12.5])('rejects bad amount %s', (amount) => {
    expect(validateDraft({ amount, date: today }, String(amount), today)).toEqual({ ok: false, reason: 'bad_amount' });
  });
  it('rejects an amount that is not in the transcript (hallucination guard)', () => {
    expect(validateDraft({ amount: 800, date: today }, 'I worked for 700', today)).toEqual({
      ok: false,
      reason: 'amount_not_in_transcript',
    });
  });
  it('accepts an amount spoken as words', () => {
    expect(validateDraft({ amount: 700, date: today }, 'saat sau rupaye', today)).toEqual({ ok: true });
    expect(validateDraft({ amount: 1000, date: today }, '1,000 rupees', today)).toEqual({ ok: true });
  });
  it('rejects a future date', () => {
    expect(validateDraft({ amount: 700, date: '2026-11-28' }, '700', today)).toEqual({ ok: false, reason: 'future_date' });
  });
  it('rejects impossible hours', () => {
    expect(validateDraft({ amount: 700, hours: 30, date: today }, '700', today)).toEqual({ ok: false, reason: 'bad_hours' });
    expect(validateDraft({ amount: 700, hours: 0, date: today }, '700', today)).toEqual({ ok: false, reason: 'bad_hours' });
  });
});

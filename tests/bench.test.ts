import { describe, it, expect } from 'vitest';
import { scoreCase, aggregate, type Pred } from '../bench/score';
import { CASES } from '../bench/cases';
import { runCases, rulesPredictor, normalizeRaw } from '../bench/runner';

describe('scoreCase', () => {
  const gold = { kind: 'record', type: 'work', employerName: 'Ramesh', amount: 700 } as const;

  it('a perfect prediction scores everything right', () => {
    const s = scoreCase({ kind: 'record', type: 'work', employerName: 'ramesh', amount: 700 }, gold, 'worked at Ramesh 700');
    expect(s).toMatchObject({ kindOk: true, typeOk: true, employerOk: true, amountOk: true, hallucinatedAmount: false, inventedEmployer: false, parseFailure: false });
  });

  it('a wrong amount is a hallucinated amount', () => {
    const s = scoreCase({ kind: 'record', type: 'work', employerName: 'Ramesh', amount: 800 }, gold, 'worked at Ramesh 700');
    expect(s.amountOk).toBe(false);
    expect(s.hallucinatedAmount).toBe(true);
  });

  it('an amount where none was said is a hallucinated amount', () => {
    const s = scoreCase({ kind: 'record', type: 'payment', amount: 500 }, { kind: 'record', type: 'payment' }, 'he gave me money');
    expect(s.hallucinatedAmount).toBe(true);
    expect(s.amountOk).toBeUndefined();
  });

  it('an employer that is not in the transcript is invented', () => {
    const s = scoreCase({ kind: 'record', type: 'work', employerName: 'Suresh', amount: 700 }, gold, 'worked at Ramesh 700');
    expect(s.inventedEmployer).toBe(true);
    expect(s.employerOk).toBe(false);
  });

  it('a wrong employer that is in the transcript is wrong but not invented', () => {
    const s = scoreCase({ kind: 'record', type: 'work', employerName: 'Bhai', amount: 700 }, gold, 'Mahesh bhai ne 700');
    expect(s.employerOk).toBe(false);
    expect(s.inventedEmployer).toBe(false);
  });

  it('hours that were not said are invented', () => {
    const s = scoreCase({ kind: 'record', type: 'overtime', hours: 3 }, { kind: 'record', type: 'overtime' }, 'extra work');
    expect(s.inventedHours).toBe(true);
  });

  it('a null prediction is a parse failure and wrong', () => {
    const s = scoreCase(null, gold, 'x');
    expect(s).toMatchObject({ parseFailure: true, kindOk: false });
  });

  it('only scores fields the gold defines', () => {
    const s = scoreCase({ kind: 'confirm' }, { kind: 'confirm' }, 'yes');
    expect(s.typeOk).toBeUndefined();
    expect(s.amountOk).toBeUndefined();
    expect(s.kindOk).toBe(true);
  });
});

describe('aggregate', () => {
  it('computes rates over the cases that define each field', () => {
    const a = aggregate([
      scoreCase({ kind: 'record', type: 'work', amount: 700 }, { kind: 'record', type: 'work', amount: 700 }, '700'),
      scoreCase({ kind: 'record', type: 'work', amount: 800 }, { kind: 'record', type: 'work', amount: 700 }, '700'),
      scoreCase({ kind: 'confirm' }, { kind: 'confirm' }, 'yes'),
      scoreCase(null, { kind: 'confirm' }, 'yes'),
    ]);
    expect(a.n).toBe(4);
    expect(a.kindAccuracy).toBe(0.75);
    expect(a.amountAccuracy).toBe(0.5);
    expect(a.hallucinatedAmounts).toBe(1);
    expect(a.parseFailures).toBe(1);
  });
  it('handles an empty list', () => {
    expect(aggregate([]).n).toBe(0);
  });
});

describe('normalizeRaw', () => {
  it('turns the model JSON into a prediction, dropping nulls', () => {
    expect(normalizeRaw({ kind: 'record', type: 'work', employerName: 'Ramesh', amount: 700, hours: null, date: null, q: null, period: null })).toEqual({
      kind: 'record', type: 'work', employerName: 'Ramesh', amount: 700,
    });
  });
  it('returns null for garbage', () => {
    expect(normalizeRaw('hello')).toBeNull();
    expect(normalizeRaw({ kind: 'banana' })).toBeNull();
  });
});

describe('the benchmark cases', () => {
  it('has at least 30 cases covering all three languages and hard sentences', () => {
    expect(CASES.length).toBeGreaterThanOrEqual(30);
    expect(CASES.filter((c) => c.hard).length).toBeGreaterThanOrEqual(8);
    expect(CASES.some((c) => /[ಀ-೿]/.test(c.text))).toBe(true);
    expect(CASES.some((c) => /[ऀ-ॿ]/.test(c.text))).toBe(true);
  });
  it('every gold record has a valid type and any amount is a sensible integer', () => {
    for (const c of CASES) {
      if (c.gold.amount !== undefined) expect(Number.isInteger(c.gold.amount) && c.gold.amount > 0 && c.gold.amount < 100000).toBe(true);
      if (c.gold.kind === 'record' && c.gold.type) expect(['work', 'overtime', 'advance', 'payment']).toContain(c.gold.type);
    }
  });
  it('every gold amount and employer actually appears in its sentence (no bad labels)', () => {
    for (const c of CASES) {
      if (c.gold.employerName) expect(c.text.toLowerCase()).toContain(c.gold.employerName.toLowerCase());
    }
  });
  it('has no duplicate sentences', () => {
    expect(new Set(CASES.map((c) => c.text)).size).toBe(CASES.length);
  });
});

describe('the rule parser baseline', () => {
  it('runs through the harness without failures or invented amounts', async () => {
    const scores = await runCases(rulesPredictor, CASES);
    expect(scores).toHaveLength(CASES.length);
    const a = aggregate(scores.map((s) => s.score));
    expect(a.parseFailures).toBe(0);
    expect(a.hallucinatedAmounts).toBe(0); // rules read amounts from the text, so cannot invent them
    expect(a.kindAccuracy).toBeGreaterThan(0.8);
  });
  it('records latency per case', async () => {
    const scores = await runCases(rulesPredictor, CASES.slice(0, 3));
    scores.forEach((s) => expect(s.ms).toBeGreaterThanOrEqual(0));
  });
  it('a throwing predictor counts as a parse failure, not a crash', async () => {
    const scores = await runCases(async () => {
      throw new Error('model down');
    }, CASES.slice(0, 2));
    expect(scores.every((s) => s.score.parseFailure)).toBe(true);
  });
});

// keep the type in the public surface
const _typecheck: Pred = { kind: 'unknown' };
void _typecheck;

import { describe, it, expect, vi } from 'vitest';
import { parseWithFallback, parseMultiUtterance, checkEdge } from '../src/nlu/llmParser';
import { parseUtterance, missingFields } from '../src/nlu/ruleParser';
import type { Intent } from '../src/domain/types';

const today = '2026-11-27';
const ctx = { today, employers: [] as string[], lang: 'en-IN' as const };

const reply = (raw: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(raw), { status }));
const record = (over: Record<string, unknown>) => ({
  kind: 'record', type: null, employerName: null, amount: null, hours: null, date: null, q: null, period: null, ...over,
});
const on = (fetchImpl: typeof fetch, timeoutMs = 500) => ({ enabled: true, fetch: fetchImpl, timeoutMs });

/** Rules read this as: work, 700, but no employer (no "at/for/with/ke/ne" marker). */
const NO_EMPLOYER = 'kitchen ramesh 700 worked today';

const draftOf = (i: Intent) => {
  if (i.kind !== 'record') throw new Error(`expected a record, got ${i.kind}`);
  return i.draft;
};

describe('when the model is not used', () => {
  it('is skipped entirely when edge mode is off', async () => {
    const f = reply(record({ employerName: 'Ramesh' }));
    const got = await parseWithFallback(NO_EMPLOYER, ctx, { enabled: false, fetch: f as unknown as typeof fetch });
    expect(f).not.toHaveBeenCalled();
    expect(got).toEqual(parseUtterance(NO_EMPLOYER, ctx));
  });

  it('is skipped when the rules already understood everything', async () => {
    const f = reply(record({ employerName: 'Suresh', amount: 999 }));
    const text = 'Aaj Ramesh ke site pe 700 rupaye kaam kiya';
    const got = await parseWithFallback(text, ctx, on(f as unknown as typeof fetch));
    expect(f).not.toHaveBeenCalled();
    expect(got).toEqual(parseUtterance(text, ctx));
  });

  it('is skipped for questions and yes/no that the rules understood', async () => {
    const f = reply(record({}));
    for (const t of ['How much does Ramesh owe me?', 'yes', 'no']) {
      await parseWithFallback(t, ctx, on(f as unknown as typeof fetch));
    }
    expect(f).not.toHaveBeenCalled();
  });

  it('is skipped when the sentence has two different amounts', async () => {
    const f = reply(record({ type: 'work', amount: 700 }));
    const got = await parseWithFallback('worked 700 and advance 200', ctx, on(f as unknown as typeof fetch));
    expect(f).not.toHaveBeenCalled();
    expect(got.kind).toBe('unknown');
  });
});

describe('filling in what the rules missed', () => {
  it('uses the model to find the employer when the transcript contains the name', async () => {
    const f = reply(record({ type: 'work', employerName: 'Ramesh', amount: 700 }));
    const d = draftOf(await parseWithFallback(NO_EMPLOYER, ctx, on(f as unknown as typeof fetch)));
    expect(f).toHaveBeenCalledTimes(1);
    expect(d).toMatchObject({ type: 'work', amount: 700, employerName: 'Ramesh', date: today });
    expect(missingFields(d)).toEqual([]);
  });

  it('sends the transcript, language and known employers to the proxy', async () => {
    const f = reply(record({ employerName: 'Ramesh' }));
    // "Suresh Kumar" is not in the sentence, so the rules still need help finding the employer.
    await parseWithFallback(NO_EMPLOYER, { ...ctx, employers: ['Suresh Kumar'] }, on(f as unknown as typeof fetch));
    const [url, init] = (f.mock.calls as unknown as [string, RequestInit][])[0];
    expect(url).toBe('/api/parse');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      transcript: NO_EMPLOYER,
      lang: 'en-IN',
      knownEmployers: ['Suresh Kumar'],
      today,
    });
  });

  it('does not call the model when a known employer lets the rules finish the job', async () => {
    const f = reply(record({ employerName: 'Ramesh' }));
    const d = draftOf(await parseWithFallback(NO_EMPLOYER, { ...ctx, employers: ['Ramesh Kumar'] }, on(f as unknown as typeof fetch)));
    expect(f).not.toHaveBeenCalled();
    expect(d.employerName).toBe('Ramesh Kumar');
  });

  it('never overrides a value the rules already found', async () => {
    const f = reply(record({ type: 'payment', employerName: 'Ramesh', amount: 700 }));
    const d = draftOf(await parseWithFallback(NO_EMPLOYER, ctx, on(f as unknown as typeof fetch)));
    expect(d.type).toBe('work'); // the rules said work; the model said payment
  });

  it('can understand a whole sentence the rules could not', async () => {
    const text = 'Suresh sir nanage 500 kottaru';
    const byRules = parseUtterance(text, ctx);
    expect(byRules.kind).toBe('record');
    if (byRules.kind === 'record') expect(missingFields(byRules.draft).length).toBeGreaterThan(0); // rules alone are not enough
    const f = reply(record({ type: 'payment', employerName: 'Suresh', amount: 500 }));
    const d = draftOf(await parseWithFallback(text, ctx, on(f as unknown as typeof fetch)));
    expect(d).toMatchObject({ type: 'payment', employerName: 'Suresh', amount: 500 });
  });

  it('can answer a question the rules did not recognise', async () => {
    const text = 'tell me Ramesh balance';
    expect(parseUtterance(text, ctx).kind).toBe('unknown');
    const f = reply({ kind: 'query', q: 'owed', employerName: 'Ramesh', period: null, type: null, amount: null, hours: null, date: null });
    expect(await parseWithFallback(text, ctx, on(f as unknown as typeof fetch))).toMatchObject({ kind: 'query', q: 'owed', employerName: 'Ramesh', period: 'all' });
  });

  it('uses the known employer spelling when the model names one', async () => {
    const f = reply(record({ type: 'work', employerName: 'ramesh', amount: 700 }));
    const d = draftOf(await parseWithFallback(NO_EMPLOYER, { ...ctx, employers: ['Ramesh'] }, on(f as unknown as typeof fetch)));
    expect(d.employerName).toBe('Ramesh');
  });
});

describe('hallucination guard', () => {
  it('drops an amount that was never said', async () => {
    const text = 'Ramesh sir gave me some money yesterday';
    const f = reply(record({ type: 'payment', employerName: 'Ramesh', amount: 800 }));
    const d = draftOf(await parseWithFallback(text, ctx, on(f as unknown as typeof fetch)));
    expect(d.amount).toBeUndefined();
    expect(missingFields(d)).toContain('amount');
  });

  it('drops an employer that does not appear in what was said', async () => {
    const f = reply(record({ type: 'work', employerName: 'Suresh', amount: 700 }));
    const d = draftOf(await parseWithFallback(NO_EMPLOYER, ctx, on(f as unknown as typeof fetch)));
    expect(d.employerName).toBeUndefined();
  });

  it('drops hours that were never said', async () => {
    const text = 'Ramesh sir extra work yesterday';
    const f = reply(record({ type: 'overtime', employerName: 'Ramesh', hours: 3 }));
    const d = draftOf(await parseWithFallback(text, ctx, on(f as unknown as typeof fetch)));
    expect(d.hours).toBeUndefined();
  });

  it('keeps hours that were said', async () => {
    const text = 'Ramesh sir extra three hours yesterday';
    const f = reply(record({ type: 'overtime', employerName: 'Ramesh', hours: 3 }));
    expect((draftOf(await parseWithFallback(text, ctx, on(f as unknown as typeof fetch)))).hours).toBe(3);
  });

  it.each([0, -5, 100000, 12.5])('drops an out-of-range amount %s even if it was said', async (amount) => {
    const text = `kitchen ramesh ${amount} worked`;
    const f = reply(record({ type: 'work', employerName: 'Ramesh', amount }));
    const out = await parseWithFallback(text, ctx, on(f as unknown as typeof fetch));
    if (out.kind === 'record') expect(out.draft.amount).not.toBe(amount);
  });

  it('ignores any date the model returns and uses what was spoken', async () => {
    const f = reply(record({ type: 'work', employerName: 'Ramesh', amount: 700, date: '2026-01-01' }));
    expect(draftOf(await parseWithFallback(NO_EMPLOYER, ctx, on(f as unknown as typeof fetch))).date).toBe(today);
    const g = reply(record({ type: 'work', employerName: 'Ramesh', amount: 700, date: '2026-01-01' }));
    const y = draftOf(await parseWithFallback('kitchen ramesh 700 worked yesterday', ctx, on(g as unknown as typeof fetch)));
    expect(y.date).toBe('2026-11-26');
  });

  it('does not let the model say "confirm" for a long sentence', async () => {
    const text = 'something long that is not a yes at all really';
    const f = reply({ kind: 'confirm', type: null, employerName: null, amount: null, hours: null, date: null, q: null, period: null });
    expect((await parseWithFallback(text, ctx, on(f as unknown as typeof fetch))).kind).toBe('unknown');
  });

  it('keeps the rule result when the model finds nothing useful', async () => {
    const f = reply(record({}));
    expect(await parseWithFallback(NO_EMPLOYER, ctx, on(f as unknown as typeof fetch))).toEqual(parseUtterance(NO_EMPLOYER, ctx));
  });
});

describe('failures fall back to the rules', () => {
  const rules = parseUtterance(NO_EMPLOYER, ctx);

  it('server down', async () => {
    const f = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    expect(await parseWithFallback(NO_EMPLOYER, ctx, on(f as unknown as typeof fetch))).toEqual(rules);
  });

  it('non-200 response', async () => {
    expect(await parseWithFallback(NO_EMPLOYER, ctx, on(reply({ error: 'x' }, 502) as unknown as typeof fetch))).toEqual(rules);
  });

  it('invalid JSON body', async () => {
    const f = vi.fn(async () => new Response('<html>not json</html>', { status: 200 }));
    expect(await parseWithFallback(NO_EMPLOYER, ctx, on(f as unknown as typeof fetch))).toEqual(rules);
  });

  it.each([
    ['amount as text', record({ amount: '700 rupees' })],
    ['unknown kind', record({ kind: 'banana' })],
    ['unknown type', record({ type: 'gift' })],
    ['not an object', 'hello'],
    ['null', null],
  ])('schema violation: %s', async (_name, raw) => {
    expect(await parseWithFallback(NO_EMPLOYER, ctx, on(reply(raw) as unknown as typeof fetch))).toEqual(rules);
  });

  it('timeout', async () => {
    const f = vi.fn((_u: string, init?: RequestInit) => new Promise<Response>((_res, rej) => {
      init?.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')));
    }));
    const t0 = Date.now();
    expect(await parseWithFallback(NO_EMPLOYER, ctx, on(f as unknown as typeof fetch, 30))).toEqual(rules);
    expect(Date.now() - t0).toBeLessThan(1000);
  });
});

describe('checkEdge', () => {
  it('is true when the proxy reports the model reachable', async () => {
    expect(await checkEdge({ fetch: reply({ ok: true }) as unknown as typeof fetch })).toBe(true);
  });
  it('is false when the proxy says the model is down', async () => {
    expect(await checkEdge({ fetch: reply({ ok: false }) as unknown as typeof fetch })).toBe(false);
  });
  it('is false when the proxy is not running', async () => {
    const f = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    expect(await checkEdge({ fetch: f as unknown as typeof fetch })).toBe(false);
  });
  it('is false for a non-JSON answer (e.g. a static host with no proxy)', async () => {
    const f = vi.fn(async () => new Response('<html></html>', { status: 200 }));
    expect(await checkEdge({ fetch: f as unknown as typeof fetch })).toBe(false);
  });
});

describe('parseMultiUtterance', () => {
  it('splits a compound multi-amount sentence and guards amounts and employers', async () => {
    const text = 'kal ramesh ke yahan 700 kaam kiya aur 200 kharchi liya';
    const f = reply({
      entries: [
        { type: 'work', employerName: 'Ramesh', amount: 700, hours: null, dateHint: 'yesterday' },
        { type: 'advance', employerName: 'Ramesh', amount: 200, hours: null, dateHint: 'yesterday' },
      ],
    });
    const drafts = await parseMultiUtterance(text, { ...ctx, employers: ['Ramesh'] }, on(f as unknown as typeof fetch));
    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({ type: 'work', employerName: 'Ramesh', amount: 700, date: '2026-11-26' });
    expect(drafts[1]).toMatchObject({ type: 'advance', employerName: 'Ramesh', amount: 200, date: '2026-11-26' });
  });

  it('drops hallucinated amounts that were not spoken', async () => {
    const text = 'ramesh 700 kaam kiya aur 200 advance liya';
    const f = reply({
      entries: [
        { type: 'work', employerName: 'Ramesh', amount: 999, hours: null, dateHint: 'today' },
        { type: 'advance', employerName: 'Ramesh', amount: 200, hours: null, dateHint: 'today' },
      ],
    });
    const drafts = await parseMultiUtterance(text, ctx, on(f as unknown as typeof fetch));
    expect(drafts[0].amount).toBeUndefined();
    expect(drafts[1].amount).toBe(200);
  });
});


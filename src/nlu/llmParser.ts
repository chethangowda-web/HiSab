import type { Draft, EntryType, Intent, QueryKind } from '../domain/types';
import { allNumbers, moneyAmounts, resolveDate, tokenize } from './normalize';
import { display, isNameToken, missingFields, parseUtterance, type ParseContext } from './ruleParser';

/**
 * Optional "edge mode": a small open-source model, run locally behind /api/parse, helps when the
 * rule parser could not fully understand a sentence. It can only FILL IN what the rules missed,
 * and every value it gives must appear in what the user actually said. Any failure falls back
 * to the rules, so the app never depends on it.
 */

export interface EdgeOptions {
  enabled: boolean;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 4000;
const KINDS = ['record', 'query', 'confirm', 'deny', 'unknown'] as const;
const TYPES: EntryType[] = ['work', 'overtime', 'advance', 'payment'];
const QS: QueryKind[] = ['owed', 'earned', 'advances', 'days'];

export interface RawParse {
  kind: (typeof KINDS)[number];
  type: EntryType | null;
  employerName: string | null;
  amount: number | null;
  hours: number | null;
  q: QueryKind | null;
  period: 'month' | 'all' | null;
}

const nullable = <T>(v: unknown, ok: (x: unknown) => x is T): T | null | undefined =>
  v === null || v === undefined ? null : ok(v) ? v : undefined;
const isStr = (x: unknown): x is string => typeof x === 'string';
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** Strictly reads the model's JSON. Returns null for anything that does not match the schema. */
export function readRaw(x: unknown): RawParse | null {
  if (typeof x !== 'object' || x === null) return null;
  const o = x as Record<string, unknown>;
  if (!KINDS.includes(o.kind as (typeof KINDS)[number])) return null;
  const type = nullable(o.type, (v): v is EntryType => TYPES.includes(v as EntryType));
  const employerName = nullable(o.employerName, isStr);
  const amount = nullable(o.amount, isNum);
  const hours = nullable(o.hours, isNum);
  const q = nullable(o.q, (v): v is QueryKind => QS.includes(v as QueryKind));
  const period = nullable(o.period, (v): v is 'month' | 'all' => v === 'month' || v === 'all');
  if ([type, employerName, amount, hours, q, period].some((v) => v === undefined)) return null;
  return {
    kind: o.kind as RawParse['kind'],
    type: type as EntryType | null,
    employerName: employerName as string | null,
    amount: amount as number | null,
    hours: hours as number | null,
    q: q as QueryKind | null,
    period: period as RawParse['period'],
  };
}

const AMOUNT_MAX = 100000;
const guardAmount = (a: number | null, text: string): number | undefined =>
  a !== null && Number.isInteger(a) && a > 0 && a < AMOUNT_MAX && allNumbers(text).includes(a) ? a : undefined;

const guardHours = (h: number | null, text: string): number | undefined =>
  h !== null && h > 0 && h <= 24 && allNumbers(text).includes(Math.round(h)) ? h : undefined;

/** The name must be a real name, and every word of it must have been said. */
function guardEmployer(name: string | null, text: string, known: string[]): string | undefined {
  if (!name) return undefined;
  const words = tokenize(name.replace(/['’]s\b/g, ''));
  if (words.length === 0 || !words.every((w) => isNameToken(w))) return undefined;
  const said = new Set(tokenize(text).map((t) => t.replace(/['’]s$/, '')));
  if (!words.every((w) => said.has(w))) return undefined;

  const lower = name.trim().toLowerCase();
  const exact = known.find((k) => k.toLowerCase() === lower);
  if (exact) return exact;
  const byFirst = known.filter((k) => k.toLowerCase().split(/\s+/)[0] === lower);
  return byFirst.length === 1 ? byFirst[0] : display(words.join(' '));
}

function isGoodEnough(rule: Intent): boolean {
  if (rule.kind === 'unknown') return false;
  if (rule.kind === 'record') return missingFields(rule.draft).length === 0;
  return true;
}

const MONTH_WORD = /month|mahine|mahina|महीन|ತಿಂಗಳ/;

/** Combines the rule result with the (guarded) model answer. Returns null if the model adds nothing. */
function merge(rule: Intent, raw: RawParse, text: string, ctx: ParseContext): Intent | null {
  const ruleDraft: Draft = rule.kind === 'record' ? rule.draft : {};
  const employerName = guardEmployer(raw.employerName, text, ctx.employers);

  switch (raw.kind) {
    case 'record': {
      const draft: Draft = { rawTranscript: text, lang: ctx.lang, date: resolveDate(text, ctx.today) ?? ctx.today };
      const fromModel = { type: raw.type ?? undefined, amount: guardAmount(raw.amount, text), hours: guardHours(raw.hours, text), employerName };
      // Rules win: the model only fills fields the rules left empty.
      for (const k of ['type', 'amount', 'hours', 'employerName'] as const) {
        const v = ruleDraft[k] ?? fromModel[k];
        if (v !== undefined) (draft as Record<string, unknown>)[k] = v;
      }
      if (draft.amount !== undefined && !(Number.isInteger(draft.amount) && draft.amount > 0 && draft.amount < AMOUNT_MAX)) delete draft.amount;
      if (draft.type === undefined && draft.amount === undefined) return null;
      return { kind: 'record', draft };
    }
    case 'query':
      if (rule.kind !== 'unknown' || !raw.q) return null;
      return { kind: 'query', q: raw.q, employerName, period: raw.period === 'month' && MONTH_WORD.test(text.toLowerCase()) ? 'month' : 'all' };
    case 'confirm':
    case 'deny':
      // Only for short replies; a long sentence is never a bare yes/no.
      return rule.kind === 'unknown' && tokenize(text).length <= 4 ? { kind: raw.kind } : null;
    default:
      return null;
  }
}

async function askProxy(text: string, ctx: ParseContext, opts: EdgeOptions): Promise<RawParse | null> {
  const f = opts.fetch ?? fetch;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await f('/api/parse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ transcript: text, lang: ctx.lang, knownEmployers: ctx.employers, today: ctx.today }),
      signal: ac.signal,
    });
    if (!res.ok) return null;
    return readRaw(await res.json());
  } catch {
    return null; // server down, timeout, or not JSON
  } finally {
    clearTimeout(timer);
  }
}

/** Rules first. The local model is consulted only when the rules could not fully understand. */
export async function parseWithFallback(text: string, ctx: ParseContext, opts: EdgeOptions): Promise<Intent> {
  const rule = parseUtterance(text, ctx);
  if (!opts.enabled || isGoodEnough(rule)) return rule;
  // Two different amounts mean two events; never let a model merge them.
  if (new Set(moneyAmounts(text)).size > 1) return rule;
  const raw = await askProxy(text, ctx, opts);
  if (!raw) return rule;
  return merge(rule, raw, text, ctx) ?? rule;
}

/** True if the proxy is running and can reach the local model. */
export async function checkEdge(opts: { fetch?: typeof fetch } = {}): Promise<boolean> {
  try {
    const res = await (opts.fetch ?? fetch)('/api/health');
    if (!res.ok) return false;
    const data = (await res.json()) as { ok?: unknown };
    return data.ok === true;
  } catch {
    return false;
  }
}

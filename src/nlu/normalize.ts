import { UNITS, MULTS, HOUR_WORDS, DAY_WORDS, FILLERS, TODAY_WORDS, YESTERDAY_WORDS, DAY_BEFORE_WORDS } from './lexicon';

const DEVANAGARI_ZERO = 0x0966;
const KANNADA_ZERO = 0x0ce6;

/** Converts Devanagari and Kannada digits to ASCII digits. */
export function normalizeDigits(text: string): string {
  return text.replace(/[०-९೦-೯]/g, (ch) => {
    const code = ch.charCodeAt(0);
    return String(code >= KANNADA_ZERO ? code - KANNADA_ZERO : code - DEVANAGARI_ZERO);
  });
}

const isNumeric = (t: string) => /^\d+(\.\d+)?$/.test(t);

/** Lowercases, normalizes digits and punctuation, and splits into tokens. */
export function tokenize(text: string): string[] {
  let s = normalizeDigits(text).normalize('NFC').toLowerCase().replace(/[‌‍]/g, '');
  s = s.replace(/(\d),(?=\d)/g, '$1'); // 1,000 -> 1000
  s = s.replace(/₹/g, ' ');
  s = s.replace(/(\d)(?=\p{L})/gu, '$1 '); // 2hrs -> 2 hrs
  s = s.replace(/[^\p{L}\p{N}\p{M}'’.\-\s]/gu, ' ');
  s = s.replace(/(?<!\d)\.|\.(?!\d)/g, ' '); // keep decimal points only
  s = s.replace(/(?<!\d)-|-(?!\d)/g, ' '); // keep hyphens only inside dates
  return s.split(/\s+/).filter(Boolean);
}

const ALL_KEYS = [...UNITS.keys(), ...MULTS.keys()].sort((a, b) => b.length - a.length);

/** Splits a compound number word such as "ಏಳುನೂರು" into ["ಏಳು", "ನೂರು"], or returns null. */
function segment(token: string): string[] | null {
  const memo = new Map<number, string[] | null>();
  const go = (i: number): string[] | null => {
    if (i === token.length) return [];
    if (memo.has(i)) return memo.get(i)!;
    let result: string[] | null = null;
    for (const key of ALL_KEYS) {
      if (token.startsWith(key, i)) {
        const rest = go(i + key.length);
        if (rest) {
          result = [key, ...rest];
          break;
        }
      }
    }
    memo.set(i, result);
    return result;
  };
  const parts = go(0);
  return parts && parts.length >= 2 ? parts : null;
}

function expandTokens(tokens: string[]): string[] {
  const out: string[] = [];
  for (const t of tokens) {
    if (t.length >= 5 && !UNITS.has(t) && !MULTS.has(t) && !isNumeric(t)) {
      const parts = segment(t);
      if (parts) {
        out.push(...parts);
        continue;
      }
    }
    out.push(t);
  }
  return out;
}

interface Run {
  value: number;
  start: number;
  end: number;
}

const isMult = (t: string | undefined) => t !== undefined && MULTS.has(t);
const isUnitLike = (t: string | undefined) => t !== undefined && (UNITS.has(t) || MULTS.has(t) || isNumeric(t));

/** Latin "do" is a number (2) only before a multiplier or an hour/day word. */
function unitValue(tokens: string[], j: number): number | undefined {
  const t = tokens[j];
  if (t === 'do') {
    const next = tokens[j + 1];
    return isMult(next) || (next !== undefined && (HOUR_WORDS.has(next) || DAY_WORDS.has(next))) ? 2 : undefined;
  }
  return UNITS.get(t);
}

function findRuns(tokens: string[]): Run[] {
  const runs: Run[] = [];
  let i = 0;
  while (i < tokens.length) {
    let total = 0;
    let current = 0;
    let any = false;
    let last = -1;
    let lastUnit = 0; // value of the previous unit word, 0 if the previous token was not a unit
    let prevDigit = false;
    let j = i;
    for (; j < tokens.length; j++) {
      const t = tokens[j];
      const uv = unitValue(tokens, j);
      if (isNumeric(t)) {
        if (prevDigit) break;
        current += parseFloat(t);
        prevDigit = true;
        lastUnit = 0;
      } else if (uv !== undefined) {
        const additive = (lastUnit >= 20 && lastUnit % 10 === 0 && uv < 10) || (lastUnit >= 100 && lastUnit % 100 === 0 && uv < 100);
        if (any && lastUnit > 0 && !additive) break;
        current += uv;
        lastUnit = uv;
        prevDigit = false;
      } else if (MULTS.has(t)) {
        const m = MULTS.get(t)!;
        if (m === 100) current = (current || 1) * 100;
        else {
          total += (current || 1) * m;
          current = 0;
        }
        lastUnit = 0;
        prevDigit = false;
      } else if (t === 'and' && any && isUnitLike(tokens[j + 1])) {
        continue;
      } else {
        break;
      }
      any = true;
      last = j;
    }
    if (any) {
      runs.push({ value: total + current, start: i, end: last });
      i = last + 1;
    } else {
      i++;
    }
  }
  return runs;
}

function followedBy(tokens: string[], end: number, words: Set<string>): boolean {
  let idx = end + 1;
  if (tokens[idx] !== undefined && FILLERS.has(tokens[idx])) idx++;
  return tokens[idx] !== undefined && words.has(tokens[idx]);
}

const runsOf = (text: string) => {
  const tokens = expandTokens(tokenize(text));
  return { tokens, runs: findRuns(tokens) };
};

/** Every money amount in the text: numbers that are not a count of hours or days. */
export function moneyAmounts(text: string): number[] {
  const { tokens, runs } = runsOf(text);
  return runs
    .filter((r) => r.value > 0 && !followedBy(tokens, r.end, HOUR_WORDS) && !followedBy(tokens, r.end, DAY_WORDS))
    .map((r) => Math.round(r.value));
}

/** The money amount in the text: the largest number that is not a count of hours or days. */
export function parseNumber(text: string): number | null {
  const money = moneyAmounts(text);
  return money.length === 0 ? null : Math.max(...money);
}

/** The number of hours mentioned ("two extra hours" -> 2), or null. */
export function parseHours(text: string): number | null {
  const { tokens, runs } = runsOf(text);
  const r = runs.find((x) => x.value > 0 && followedBy(tokens, x.end, HOUR_WORDS));
  return r ? r.value : null;
}

/** Every number in the text, including hours and days (used by the hallucination guard). */
export function allNumbers(text: string): number[] {
  return runsOf(text).runs.map((r) => Math.round(r.value));
}

function shift(today: string, days: number): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Resolves aaj/today, kal/yesterday, parso/day-before-yesterday or an ISO date to an ISO date. */
export function resolveDate(text: string, today: string): string | null {
  const tokens = tokenize(text);
  const iso = tokens.find((t) => /^\d{4}-\d{2}-\d{2}$/.test(t));
  if (iso && !Number.isNaN(Date.parse(`${iso}T00:00:00Z`))) return iso;
  const joined = tokens.join(' ');
  if (joined.includes('day before yesterday') || tokens.some((t) => DAY_BEFORE_WORDS.has(t))) return shift(today, -2);
  if (tokens.some((t) => YESTERDAY_WORDS.has(t))) return shift(today, -1);
  if (tokens.some((t) => TODAY_WORDS.has(t))) return today;
  return null;
}

import type { CommandKind, Draft, EntryType, Intent, Lang, QueryKind } from '../domain/types';
import { UNITS, MULTS, YES_WORDS, NO_WORDS } from './lexicon';
import { isPerDay, moneyAmounts, parseDays, parseNumber, parseHours, resolveDate, tokenize } from './normalize';

export interface ParseContext {
  today: string;
  /** Names of employers already in the ledger. */
  employers: string[];
  lang: Lang;
}

const nfc = (s: string) => s.normalize('NFC');
const set = (words: string[]) => new Set(words.map(nfc));

// Polite words said after a name ("Ramesh anna", "Mahesh bhai", "रमेश भाई"). Never a name themselves;
// the word before one IS the name.
const HONORIFICS = set([
  'sir', 'anna', 'bhai', 'bhaiya', 'bhaiyya', 'bhaiyaa', 'sahab', 'saheb', 'sahib', 'ji', 'madam', 'ayya', 'akka', 'aunty', 'uncle',
  'सर', 'भाई', 'भैया', 'साहब', 'साहेब', 'जी',
  'ಸರ್', 'ಅಣ್ಣ', 'ಅಯ್ಯ', 'ಸಾಹೇಬ್', 'ಅಕ್ಕ',
]);

// ---- words that are never an employer name ----
const NOT_A_NAME = set([
  ...HONORIFICS,
  'the', 'a', 'an', 'my', 'me', 'i', 'you', 'he', 'she', 'they', 'we', 'it', 'is', 'are', 'was', 'were', 'and', 'or', 'of', 'in', 'on',
  'at', 'for', 'from', 'to', 'with', 'by', 'this', 'that', 'how', 'much', 'many', 'what', 'when', 'tell', 'show', 'still', 'not', 'did',
  'do', 'does', 'have', 'has', 'had', 'worked', 'work', 'gave', 'give', 'paid', 'pay', 'got', 'received', 'took', 'owe', 'owes',
  'think', 'maybe', 'probably', 'please', 'sorry', 'hello', 'hi', 'hey', 'yes', 'no', 'okay', 'ok', 'yeah',
  'today', 'yesterday', 'month', 'day', 'days', 'hour', 'hours', 'extra', 'overtime', 'advance', 'money', 'rupees', 'rupee', 'rs',
  'site', 'construction', 'house', 'home', 'shop', 'factory', 'contractor', 'owner', 'boss', 'sir', 'madam', 'employer', 'thekedar',
  'malik', 'seth', 'sethji', 'aaj', 'kal', 'kaam', 'kiya', 'kiye', 'diya', 'diye', 'mila', 'mile', 'mujhe', 'mujhko', 'maine', 'hum',
  'mere', 'mera', 'meri', 'hamara', 'hamari', 'unke', 'unka', 'uski', 'uske',
  'hame', 'hamen', 'ne', 'ke', 'ka', 'ki', 'se', 'ko', 'pe', 'par', 'mein', 'me', 'hai', 'hain', 'tha', 'thi', 'kitna', 'kitne',
  'kitni', 'dena', 'rupaye', 'rupay', 'paise', 'paisa', 'yahan', 'ghar', 'is', 'mahine', 'din', 'ghante', 'kelasa', 'madide', 'avara',
  'avaru', 'avarige', 'alli', 'nanage', 'ivattu', 'indu', 'ninne', 'ondu',
  'आज', 'कल', 'काम', 'किया', 'साइट', 'मुझे', 'मैंने', 'मेरे', 'मेरा', 'मेरी', 'हमारा', 'हमारी', 'कितना', 'देना', 'है', 'रुपये', 'रुपए', 'ठेकेदार', 'मालिक', 'दिया', 'दिए',
  'मिले', 'पर', 'में', 'ने', 'के', 'का', 'की', 'से', 'को', 'नहीं', 'हाँ', 'हा', 'जी', 'ठीक',
  'ಇಂದು', 'ಇವತ್ತು', 'ನಿನ್ನೆ', 'ಕೆಲಸ', 'ಸೈಟ್', 'ನನಗೆ', 'ನನ್ನ', 'ನಾನು', 'ಅದು', 'ಇದು', 'ಎಷ್ಟು', 'ಕೊಡಬೇಕು', 'ರೂಪಾಯಿ', 'ಗುತ್ತಿಗೆದಾರ', 'ಮಾಲೀಕ', 'ಮಾಡಿದೆ',
]);

// Words that sit right after an employer name: "Ramesh ke", "Ramesh ne", "ರಮೇಶ್ ಅವರ", "Ramesh avara".
const NAME_MARKERS = set([
  'ke', 'ka', 'ki', 'ne', 'se', 'ko', 'avara', 'avaru', 'avarige', 'avarinda',
  'के', 'का', 'की', 'ने', 'से', 'को',
  'ಅವರ', 'ಅವರು', 'ಅವರಿಗೆ', 'ಅವರಿಂದ', 'ಬಳಿ', 'ಹತ್ತಿರ', 'ಕಡೆ',
]);

export const isNameToken = (raw: string): boolean => {
  const t = raw.replace(/['’]s$/, '');
  return (
    t.length >= 2 &&
    /^[\p{L}\p{M}]+$/u.test(t) &&
    !NOT_A_NAME.has(t) &&
    !UNITS.has(t) &&
    !MULTS.has(t)
  );
};

export const display = (t: string) => {
  const clean = t.replace(/['’]s$/, '');
  return /^[a-z]/.test(clean) ? clean[0].toUpperCase() + clean.slice(1) : clean;
};

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

/** A spoken token matches a known first name if identical, or off by one letter for names of 5+ letters. */
function matchKnown(tokens: string[], known: string[]): string | undefined {
  const matched = new Map<string, string>(); // canonical -> spoken token
  for (const name of known) {
    const first = nfc(name.toLowerCase().split(/\s+/)[0]);
    const tol = first.length >= 5 ? 1 : 0;
    for (const tk of tokens) {
      const t = tk.replace(/['’]s$/, '');
      if (!isNameToken(t)) continue;
      if (levenshtein(t, first) <= tol) matched.set(name, t);
    }
  }
  if (matched.size === 0) return undefined;
  if (matched.size === 1) return [...matched.keys()][0];
  // Two known employers share this name: keep what was spoken so the caller can ask which one.
  return display([...matched.values()][0]);
}

const EN_PATTERNS: RegExp[] = [
  /\b(?:at|for|from|with|to|by)\s+([a-z]+)/g,
  /\b(?:does|did|do|has|have|will)\s+([a-z]+)\s+(?:still\s+|not\s+)?(?:(?:have|has)\s+to\s+)?(?:owe|pay|paid|give|gave)\b/g,
  /\b([a-z]+)\s+(?:still\s+|not\s+)?(?:owes?|paid|gave)\b/g,
];

function extractEmployer(tokens: string[], known: string[]): string | undefined {
  const fromKnown = matchKnown(tokens, known);
  if (fromKnown) return fromKnown;
  // "Mahesh bhai", "Ramesh sir", "ರಮೇಶ್ ಅಣ್ಣ": the word before an honorific is the name.
  for (let i = 1; i < tokens.length; i++) {
    if (HONORIFICS.has(tokens[i]) && isNameToken(tokens[i - 1])) return display(tokens[i - 1]);
  }
  const joined = tokens.join(' ');
  for (const re of EN_PATTERNS) {
    for (const m of joined.matchAll(re)) {
      if (isNameToken(m[1])) return display(m[1]);
    }
  }
  for (let i = 1; i < tokens.length; i++) {
    if (NAME_MARKERS.has(tokens[i]) && isNameToken(tokens[i - 1])) return display(tokens[i - 1]);
  }
  return undefined;
}

// ---- intent words ----
const QUESTION = /how much|how many|kitna|kitne|kitni|कितना|कितने|कितनी|ಎಷ್ಟು|\?/;
const DAYS_Q = /how many days|days worked|kitne din|कितने दिन|ಎಷ್ಟು ದಿನ/;
const OWED_Q = /\bowe\b|\bowes\b|pending|outstanding|balance|\bbaaki\b|\bbaki\b|\bdena\b|\bdene\b|\bdue\b|unpaid|not paid|to pay me|\blena\b|\blene\b|बाकी|देना|देने|लेना|ಬಾಕಿ|ಕೊಡಬೇಕು/;
const ADVANCE_Q = /advance|peshgi|पेशगी|एडवांस|अडवांस|ಮುಂಗಡ|ಅಡ್ವಾನ್ಸ್/;
const EARNED_Q = /earn|\bmade\b|kamaya|kamai|kamaye|income|salary|कमाया|कमाई|ಸಂಪಾದ|ಗಳಿಸ/;
const MONTH = /this month|\bmonth\b|mahine|mahina|इस महीने|ಈ ತಿಂಗಳು/;

// ---- spoken commands ----
const STATEMENT_CMD = /hisa+b dikha|हिसाब दिखा|\bstatement\b|khata dikha|खाता दिखा|ಲೆಕ್ಕ ತೋರಿಸ|lekka torisi/;
const REMIND_CMD = /yaad dila|याद दिला|\bremind|ನೆನಪಿಸ|ನೆನಪು ಮಾಡ|nenapisu/;
const UNDO_CMD = /\bundo\b|(?:aakhri|akhri|last|pichli|आखिरी|पिछली|ಕೊನೆಯ)\s+(?:entry|एंट्री|ದಾಖಲೆ)|delete last|entry hatao|एंट्री हटाओ/;
const RATE_CMD = /\brate\b|रेट|ರೇಟ್/;

function commandOf(s: string, text: string): CommandKind | undefined {
  if (UNDO_CMD.test(s)) return 'undo';
  if (REMIND_CMD.test(s)) return 'remind';
  if (STATEMENT_CMD.test(s)) return 'statement';
  // "Ramesh ka rate 750 hai": a rate word and an amount, and not a work entry or a question.
  if (RATE_CMD.test(s) && parseNumber(text) !== null && !WORK_W.test(s) && !QUESTION.test(s)) return 'set_rate';
  return undefined;
}

const ADVANCE_W = /\badvance\b|peshgi|पेशगी|एडवांस|अडवांस|ಮುಂಗಡ|ಅಡ್ವಾನ್ಸ್/;
const OVERTIME_W = /overtime|\bextra\b|\bekstra\b|ओवरटाइम|ಓವರ್ಟೈಮ್|ಹೆಚ್ಚುವರಿ/;
const PAYMENT_W = /\bpaid\b|\bpayment\b|\bgave\b|\bgive\b|\bgiven\b|\breceived\b|\bgot\b|\bdiya\b|\bdiye\b|\bmila\b|\bmile\b|\bmili\b|दिया|दिए|मिला|मिले|ಕೊಟ್ಟ|ಸಿಕ್ಕಿ/;
const WORK_W = /\bwork(?:ed|ing)?\b|\bkaam\b|\bkiya\b|\bkelasa\b|\bmadide\b|\bduty\b|काम|ಕೆಲಸ/;

function queryOf(s: string): QueryKind | undefined {
  if (!QUESTION.test(s)) return undefined;
  if (DAYS_Q.test(s)) return 'days';
  if (OWED_Q.test(s)) return 'owed';
  if (ADVANCE_Q.test(s)) return 'advances';
  if (EARNED_Q.test(s)) return 'earned';
  return undefined;
}

export function typeOf(s: string): EntryType | undefined {
  if (ADVANCE_W.test(s)) return 'advance';
  if (OVERTIME_W.test(s)) return 'overtime';
  if (PAYMENT_W.test(s)) return 'payment';
  if (WORK_W.test(s)) return 'work';
  return undefined;
}

export function parseUtterance(text: string, ctx: ParseContext): Intent {
  const tokens = tokenize(text);
  if (tokens.length === 0) return { kind: 'unknown' };
  const s = tokens.join(' ');

  if (NO_WORDS.has(tokens[0])) return { kind: 'deny' };
  if (YES_WORDS.has(tokens[0]) && tokens.length <= 8) return { kind: 'confirm' };
  if (tokens.length <= 4 && /repeat|dobara|phir se|again/.test(s)) return { kind: 'repeat' };

  const cmd = commandOf(s, text);
  if (cmd) {
    const employerName = cmd === 'undo' ? undefined : extractEmployer(tokens, ctx.employers);
    const amount = cmd === 'set_rate' ? parseNumber(text) : null;
    return { kind: 'command', cmd, ...(employerName ? { employerName } : {}), ...(amount !== null ? { amount } : {}) };
  }

  const q = queryOf(s);
  if (q) {
    const employerName = extractEmployer(tokens, ctx.employers);
    return { kind: 'query', q, employerName, period: MONTH.test(s) ? 'month' : 'all' };
  }

  const spokenType = typeOf(s);
  // "3 din" with no other type word is work; days only apply to work.
  const days = spokenType === undefined || spokenType === 'work' ? parseDays(text) : null;
  const type = spokenType ?? (days ? 'work' : undefined);
  const amount = parseNumber(text);
  const hours = parseHours(text);
  if (!type && amount === null) return { kind: 'unknown' };
  // Two different amounts means two events; never merge them into one record.
  if (new Set(moneyAmounts(text)).size > 1) return { kind: 'unknown' };

  const draft: Draft = { rawTranscript: text, lang: ctx.lang, date: resolveDate(text, ctx.today) ?? ctx.today };
  if (type) draft.type = type;
  if (days) {
    draft.days = days;
    draft.perDay = isPerDay(text);
  }
  if (amount !== null) draft.amount = amount;
  if (hours !== null) draft.hours = hours;
  const employerName = extractEmployer(tokens, ctx.employers);
  if (employerName) draft.employerName = employerName;
  return { kind: 'record', draft };
}

/** Fields still needed before a record can be read back, in the order to ask for them. */
export function missingFields(draft: Draft): ('type' | 'employer' | 'amount')[] {
  const out: ('type' | 'employer' | 'amount')[] = [];
  if (!draft.type) out.push('type');
  if (!draft.employerName && !draft.employerId) out.push('employer');
  if (draft.amount === undefined) out.push('amount');
  return out;
}

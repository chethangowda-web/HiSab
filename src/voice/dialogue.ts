import type { Draft, Employer, Entry, Intent, Lang } from '../domain/types';
import { lastNDays } from '../domain/dates';
import { balance } from '../domain/ledger';
import { answerQuery, matchEmployers } from '../domain/queries';
import { commandMessages } from '../i18n/commands';
import { entryLabel, messages, type Field } from '../i18n/messages';
import { NO_WORDS, YES_WORDS } from '../nlu/lexicon';
import { allNumbers, parseNumber, tokenize } from '../nlu/normalize';
import { missingFields, parseUtterance, typeOf } from '../nlu/ruleParser';
import { validateDraft } from '../nlu/validate';

export type Phase = 'IDLE' | 'CLARIFY' | 'CONFIRM' | 'SAVED';

/** A spoken command waiting for yes/no. `question` is repeated if the answer is unclear. */
export type PendingAction =
  | { kind: 'delete'; entryId: string; question: string }
  | { kind: 'rate'; employerId: string; name: string; rate: number; question: string }
  | { kind: 'remind'; employerId: string; text: string; question: string };

export interface DialogueState {
  phase: Phase;
  draft?: Draft;
  /** In CONFIRM: a command waiting for yes/no instead of an entry. */
  action?: PendingAction;
  /** The field a CLARIFY question is waiting for. */
  asking?: Field;
  /** Consecutive "not heard" turns. */
  retries: number;
}

export const initialState: DialogueState = { phase: 'IDLE', retries: 0 };

export type DialogueEvent =
  /** `parsed`, when given, replaces the rule parser's reading of `text` (used by optional edge mode). */
  | { type: 'heard'; text: string; confidence: number; parsed?: Intent }
  | { type: 'tap_yes' }
  | { type: 'tap_no' }
  | { type: 'reset' };

export interface DialogueCtx {
  today: string;
  lang: Lang;
  employers: Employer[];
  entries: Entry[];
  newId: () => string;
  now: () => number;
  /** Used to sign reminder messages. */
  workerName?: string;
}

export interface StepResult {
  state: DialogueState;
  /** What to say out loud (and show). */
  speak?: string;
  /** The first saved entry (kept for single-entry callers); see `saves` for all of them. */
  save?: Entry;
  /** Every entry to save, set only after an explicit yes. Several for "3 din". */
  saves?: Entry[];
  /** An employer created by this save; persist it before the entries. */
  newEmployer?: Employer;
  /** Store a daily rate on an employer (learned, or set by voice after a yes). */
  updateEmployer?: { id: string; dailyRate: number };
  /** Delete this entry (after a yes). */
  deleteEntryId?: string;
  /** Open this employer's statement. */
  navigate?: { employerId: string };
  /** A reminder message to preview while waiting for yes/no. */
  reminder?: { employerId: string; text: string };
  /** Open WhatsApp with this text (after a yes). */
  openWhatsApp?: string;
  /** The UI should offer typed input. */
  needTyping?: boolean;
}

export const CONFIDENCE_MIN = 0.6;
const MAX_VOICE_RETRIES = 2;
const AMOUNT_MAX = 100000;

type Resolved =
  | { kind: 'existing'; employer: Employer }
  | { kind: 'ambiguous'; names: string[] }
  | { kind: 'new'; name: string };

function resolveEmployer(name: string, employers: Employer[]): Resolved {
  const found = matchEmployers(name, employers);
  if (found.length === 1) return { kind: 'existing', employer: found[0] };
  if (found.length > 1) return { kind: 'ambiguous', names: found.map((e) => e.name) };
  return { kind: 'new', name };
}

const withTranscript = (d: Draft, text: string): Draft => ({
  ...d,
  rawTranscript: d.rawTranscript ? `${d.rawTranscript} | ${text}` : text,
});

const isMultiDay = (d: Draft) => (d.days ?? 0) > 1;

/** Decides whether to ask another question or read the draft back for confirmation. */
function proceed(draft: Draft, ctx: DialogueCtx, prefix = ''): StepResult {
  const m = messages(ctx.lang);
  const cm = commandMessages(ctx.lang);
  let d = draft;
  let employer: Employer | undefined;
  if (d.employerName) {
    const r = resolveEmployer(d.employerName, ctx.employers);
    if (r.kind === 'ambiguous') {
      return { state: { phase: 'CLARIFY', draft: d, asking: 'employer', retries: 0 }, speak: prefix + m.which(r.names) };
    }
    if (r.kind === 'existing') {
      employer = r.employer;
      d = { ...d, employerName: r.employer.name };
    }
  }

  // Work with no amount said: use this employer's usual daily rate (clearly labelled in the read-back).
  if (d.type === 'work' && d.amount === undefined && employer?.dailyRate) {
    d = { ...d, amount: employer.dailyRate, amountFrom: 'rate', ...(isMultiDay(d) ? { perDay: true } : {}) };
  }

  // Several days: a spoken total is split evenly; if it does not split, ask the per-day amount.
  if (isMultiDay(d) && d.amount !== undefined && !d.perDay) {
    if (d.amount % d.days! === 0) d = { ...d, amount: d.amount / d.days!, perDay: true };
    else {
      return {
        state: { phase: 'CLARIFY', draft: { ...d, amount: undefined, perDay: true }, asking: 'amount', retries: 0 },
        speak: prefix + cm.askPerDay,
      };
    }
  }

  const missing = missingFields(d);
  if (missing.length > 0) {
    const perDayQuestion = missing[0] === 'amount' && isMultiDay(d);
    return {
      state: { phase: 'CLARIFY', draft: perDayQuestion ? { ...d, perDay: true } : d, asking: missing[0], retries: 0 },
      speak: prefix + (perDayQuestion ? cm.askPerDay : m.clarify(missing[0])),
    };
  }
  return commit({ phase: 'CONFIRM', draft: d, retries: 0 }, ctx);
}

function handleCommand(intent: Extract<Intent, { kind: 'command' }>, ctx: DialogueCtx): StepResult {
  const m = messages(ctx.lang);
  const cm = commandMessages(ctx.lang);

  if (intent.cmd === 'undo') {
    const last = [...ctx.entries].sort((a, b) => b.createdAt - a.createdAt)[0];
    if (!last) return { state: initialState, speak: cm.nothingToUndo };
    return { state: initialState, speak: cm.deleted, deleteEntryId: last.id };
  }

  if (!intent.employerName) return { state: initialState, speak: cm.sayName };
  const found = matchEmployers(intent.employerName, ctx.employers);
  if (found.length === 0) return { state: initialState, speak: m.answer({ key: 'unknown_employer', employerName: intent.employerName }) };
  if (found.length > 1) return { state: initialState, speak: m.answer({ key: 'ambiguous_employer', employerName: intent.employerName }) };
  const emp = found[0];

  switch (intent.cmd) {
    case 'statement':
      return { state: initialState, speak: cm.openingStatement(emp.name), navigate: { employerId: emp.id } };
    case 'remind': {
      const owed = balance(ctx.entries, emp.id);
      if (owed <= 0) return { state: initialState, speak: cm.nothingToRemind(emp.name) };
      const text = cm.reminderText(emp.name, owed, ctx.workerName);
      return {
        state: initialState,
        speak: cm.openingWhatsApp,
        openWhatsApp: text,
      };
    }
    case 'set_rate': {
      const rate = intent.amount;
      if (rate === undefined || !Number.isInteger(rate) || rate <= 0 || rate >= AMOUNT_MAX) return { state: initialState, speak: cm.badRate };
      return {
        state: initialState,
        speak: cm.rateSaved(emp.name, rate),
        updateEmployer: { id: emp.id, dailyRate: rate },
      };
    }
  }
}

function handleFresh(text: string, ctx: DialogueCtx, parsed?: Intent): StepResult {
  const m = messages(ctx.lang);
  const intent =
    parsed ??
    parseUtterance(text, {
      today: ctx.today,
      employers: ctx.employers.map((e) => e.name),
      lang: ctx.lang,
    });

  if (intent.kind === 'command') return handleCommand(intent, ctx);
  if (intent.kind === 'query') {
    const result = answerQuery(intent, ctx.entries, ctx.employers, ctx.today);
    return { state: initialState, speak: m.answer(result, intent.period) };
  }
  if (intent.kind !== 'record') return { state: initialState, speak: m.notUnderstood };

  let draft = intent.draft;
  if (draft.amount !== undefined) {
    const v = validateDraft(draft, text, ctx.today);
    if (!v.ok) {
      if (v.reason === 'bad_hours') draft = { ...draft, hours: undefined };
      else if (v.reason === 'future_date') draft = { ...draft, date: ctx.today };
      else {
        draft = { ...draft, amount: undefined };
        return { state: { phase: 'CLARIFY', draft, asking: 'amount', retries: 0 }, speak: m.unclearAmount };
      }
    }
  }
  return proceed(draft, ctx);
}

const cleanName = (text: string) => text.replace(/[^\p{L}\p{M}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const titleCase = (s: string) => s.replace(/(^|\s)([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase());

function handleClarify(state: DialogueState, text: string, ctx: DialogueCtx): StepResult {
  const m = messages(ctx.lang);
  const cm = commandMessages(ctx.lang);
  const draft = withTranscript(state.draft ?? {}, text);
  const stay = (speak: string): StepResult => ({ state: { ...state, retries: 0 }, speak });

  switch (state.asking) {
    case 'amount': {
      const n = parseNumber(text);
      if (n === null) return stay(isMultiDay(draft) ? cm.askPerDay : m.clarify('amount'));
      if (!validateDraft({ amount: n, date: ctx.today }, text, ctx.today).ok) return stay(m.unclearAmount);
      return proceed({ ...draft, amount: n, amountFrom: 'said' }, ctx);
    }
    case 'type': {
      const t = typeOf(tokenize(text).join(' '));
      if (!t) return stay(m.clarify('type'));
      return proceed({ ...draft, type: t }, ctx);
    }
    case 'employer': {
      const name = cleanName(text);
      const first = tokenize(name)[0];
      if (!name || name.split(' ').length > 3 || YES_WORDS.has(first) || NO_WORDS.has(first)) {
        return stay(m.clarify('employer'));
      }
      const lower = name.toLowerCase();
      let found = matchEmployers(name, ctx.employers);
      if (found.length === 0) {
        found = ctx.employers.filter((e) => e.name.toLowerCase().split(/\s+/).includes(lower));
      }
      if (found.length > 1) return stay(m.which(found.map((e) => e.name)));
      return proceed({ ...draft, employerName: found.length === 1 ? found[0].name : titleCase(name) }, ctx);
    }
    default:
      return handleFresh(text, ctx);
  }
}

/** The amount is safe to save: in range, and either said by the user or the employer's known rate. */
function amountTrusted(d: Draft): boolean {
  const a = d.amount;
  if (a === undefined || !Number.isInteger(a) || a <= 0 || a >= AMOUNT_MAX) return false;
  if (d.amountFrom === 'rate') return true;
  const said = allNumbers(d.rawTranscript ?? '');
  return said.includes(a) || (isMultiDay(d) && said.includes(a * d.days!));
}

function commit(state: DialogueState, ctx: DialogueCtx): StepResult {
  const m = messages(ctx.lang);
  const cm = commandMessages(ctx.lang);
  const d = state.draft;
  if (!d || !d.type || d.amount === undefined || !d.employerName) return { state };

  // Defence in depth: re-check the amount against everything the user said (or the known rate).
  if (!amountTrusted(d)) {
    return {
      state: { phase: 'CLARIFY', draft: { ...d, amount: undefined, amountFrom: undefined }, asking: 'amount', retries: 0 },
      speak: m.unclearAmount,
    };
  }

  const r = resolveEmployer(d.employerName, ctx.employers);
  if (r.kind === 'ambiguous') {
    return { state: { phase: 'CLARIFY', draft: d, asking: 'employer', retries: 0 }, speak: m.which(r.names) };
  }
  const learnsRate = d.type === 'work' && d.amountFrom !== 'rate';
  let employerId: string;
  let newEmployer: Employer | undefined;
  let updateEmployer: StepResult['updateEmployer'];
  if (r.kind === 'existing') {
    employerId = r.employer.id;
    // Learn the rate from the first spoken work amount; never overwrite a known rate by accident.
    if (learnsRate && !r.employer.dailyRate) updateEmployer = { id: r.employer.id, dailyRate: d.amount };
  } else {
    newEmployer = { id: ctx.newId(), name: r.name, ...(learnsRate ? { dailyRate: d.amount } : {}) };
    employerId = newEmployer.id;
  }

  const dates = isMultiDay(d) ? lastNDays(d.date ?? ctx.today, d.days!) : [d.date ?? ctx.today];
  const now = ctx.now();
  const saves: Entry[] = dates.map((date, i) => ({
    id: ctx.newId(),
    employerId,
    type: d.type!,
    amount: d.amount!,
    ...(d.hours !== undefined ? { hours: d.hours } : {}),
    date,
    source: 'worker',
    rawTranscript: d.rawTranscript ?? '',
    lang: ctx.lang,
    createdAt: now + i,
  }));
  return {
    state: { phase: 'SAVED', retries: 0 },
    speak: saves.length > 1 ? cm.savedDays(saves.length) : m.saved,
    save: saves[0],
    saves,
    newEmployer,
    updateEmployer,
  };
}

function commitAction(action: PendingAction, ctx: DialogueCtx): StepResult {
  const cm = commandMessages(ctx.lang);
  switch (action.kind) {
    case 'delete':
      return { state: initialState, speak: cm.deleted, deleteEntryId: action.entryId };
    case 'rate':
      return { state: initialState, speak: cm.rateSaved(action.name, action.rate), updateEmployer: { id: action.employerId, dailyRate: action.rate } };
    case 'remind':
      return { state: initialState, speak: cm.openingWhatsApp, openWhatsApp: action.text };
  }
}

function handleConfirm(state: DialogueState, text: string, ctx: DialogueCtx, parsed?: Intent): StepResult {
  const m = messages(ctx.lang);
  const intent =
    parsed ??
    parseUtterance(text, {
      today: ctx.today,
      employers: ctx.employers.map((e) => e.name),
      lang: ctx.lang,
    });

  // A command waiting for yes/no.
  if (state.action) {
    const action = state.action;
    if (intent.kind === 'confirm') return commitAction(action, ctx);
    if (intent.kind === 'deny') return { state: initialState, speak: m.discarded };
    return {
      state: { ...state, retries: 0 },
      speak: action.question,
      ...(action.kind === 'remind' ? { reminder: { employerId: action.employerId, text: action.text } } : {}),
    };
  }

  const draft = state.draft!;
  const again = (prefix = ''): StepResult => ({ state: { ...state, retries: 0 }, speak: prefix + m.readBack(draft, ctx.today) });

  switch (intent.kind) {
    case 'confirm':
      return commit(state, ctx);
    case 'deny': {
      const n = parseNumber(text);
      if (n === null) return { state: initialState, speak: m.discarded };
      const corrected = withTranscript({ ...draft, amount: n, amountFrom: 'said' }, text);
      if (!validateDraft(corrected, text, ctx.today).ok) return again(`${m.unclearAmount} `);
      return { state: { phase: 'CONFIRM', draft: corrected, retries: 0 }, speak: m.readBack(corrected, ctx.today) };
    }
    case 'record':
    case 'command':
      return handleFresh(text, ctx, intent);
    default:
      return again();
  }
}

/**
 * Pure dialogue reducer. Saves, deletes, rate changes and WhatsApp messages are produced only from a
 * CONFIRM state by an explicit confirmation (spoken yes or tap_yes); no other path can produce them.
 */
export function step(state: DialogueState, ev: DialogueEvent, ctx: DialogueCtx): StepResult {
  const m = messages(ctx.lang);
  switch (ev.type) {
    case 'reset':
      return { state: initialState };
    case 'tap_yes':
      if (state.phase !== 'CONFIRM') return { state };
      return state.action ? commitAction(state.action, ctx) : commit(state, ctx);
    case 'tap_no':
      return state.phase === 'CONFIRM' ? { state: initialState, speak: m.discarded } : { state };
    case 'heard': {
      const base: DialogueState = state.phase === 'SAVED' ? initialState : state;
      if (!ev.text.trim() || ev.confidence < CONFIDENCE_MIN) {
        const retries = base.retries + 1;
        return base.retries < MAX_VOICE_RETRIES
          ? { state: { ...base, retries }, speak: m.repeat }
          : { state: { ...base, retries }, speak: m.fallbackHint, needTyping: true };
      }
      const good: DialogueState = { ...base, retries: 0 };
      switch (good.phase) {
        case 'CLARIFY':
          return handleClarify(good, ev.text, ctx);
        case 'CONFIRM':
          return handleConfirm(good, ev.text, ctx, ev.parsed);
        default:
          return handleFresh(ev.text, ctx, ev.parsed);
      }
    }
  }
}

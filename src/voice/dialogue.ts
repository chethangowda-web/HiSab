import type { Draft, Employer, Entry, Intent, Lang } from '../domain/types';
import { answerQuery, matchEmployers } from '../domain/queries';
import { messages, type Field } from '../i18n/messages';
import { NO_WORDS, YES_WORDS } from '../nlu/lexicon';
import { parseNumber, tokenize } from '../nlu/normalize';
import { missingFields, parseUtterance, typeOf } from '../nlu/ruleParser';
import { validateDraft } from '../nlu/validate';

export type Phase = 'IDLE' | 'CLARIFY' | 'CONFIRM' | 'SAVED';

export interface DialogueState {
  phase: Phase;
  draft?: Draft;
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
}

export interface StepResult {
  state: DialogueState;
  /** What to say out loud (and show). */
  speak?: string;
  /** Set only when the user has explicitly confirmed. The caller persists it. */
  save?: Entry;
  /** An employer created by this save; persist it before the entry. */
  newEmployer?: Employer;
  /** The UI should offer typed input. */
  needTyping?: boolean;
}

export const CONFIDENCE_MIN = 0.6;
const MAX_VOICE_RETRIES = 2;

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

/** Decides whether to ask another question or read the draft back for confirmation. */
function proceed(draft: Draft, ctx: DialogueCtx, prefix = ''): StepResult {
  const m = messages(ctx.lang);
  let d = draft;
  if (d.employerName) {
    const r = resolveEmployer(d.employerName, ctx.employers);
    if (r.kind === 'ambiguous') {
      return { state: { phase: 'CLARIFY', draft: d, asking: 'employer', retries: 0 }, speak: prefix + m.which(r.names) };
    }
    if (r.kind === 'existing') d = { ...d, employerName: r.employer.name };
  }
  const missing = missingFields(d);
  if (missing.length > 0) {
    return { state: { phase: 'CLARIFY', draft: d, asking: missing[0], retries: 0 }, speak: prefix + m.clarify(missing[0]) };
  }
  return { state: { phase: 'CONFIRM', draft: d, retries: 0 }, speak: prefix + m.readBack(d, ctx.today) };
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
  const draft = withTranscript(state.draft ?? {}, text);
  const stay = (speak: string): StepResult => ({ state: { ...state, retries: 0 }, speak });

  switch (state.asking) {
    case 'amount': {
      const n = parseNumber(text);
      if (n === null) return stay(m.clarify('amount'));
      if (!validateDraft({ amount: n, date: ctx.today }, text, ctx.today).ok) return stay(m.unclearAmount);
      return proceed({ ...draft, amount: n }, ctx);
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

function commit(state: DialogueState, ctx: DialogueCtx): StepResult {
  const m = messages(ctx.lang);
  const d = state.draft;
  if (!d || !d.type || d.amount === undefined || !d.employerName) return { state };

  // Defence in depth: re-check the amount against everything the user said.
  const v = validateDraft(d, d.rawTranscript ?? '', ctx.today);
  if (!v.ok) {
    return {
      state: { phase: 'CLARIFY', draft: { ...d, amount: undefined }, asking: 'amount', retries: 0 },
      speak: m.unclearAmount,
    };
  }

  const r = resolveEmployer(d.employerName, ctx.employers);
  if (r.kind === 'ambiguous') {
    return { state: { phase: 'CLARIFY', draft: d, asking: 'employer', retries: 0 }, speak: m.which(r.names) };
  }
  let employerId: string;
  let newEmployer: Employer | undefined;
  if (r.kind === 'existing') employerId = r.employer.id;
  else {
    newEmployer = { id: ctx.newId(), name: r.name };
    employerId = newEmployer.id;
  }

  const save: Entry = {
    id: ctx.newId(),
    employerId,
    type: d.type,
    amount: d.amount,
    ...(d.hours !== undefined ? { hours: d.hours } : {}),
    date: d.date ?? ctx.today,
    source: 'worker',
    rawTranscript: d.rawTranscript ?? '',
    lang: ctx.lang,
    createdAt: ctx.now(),
  };
  return { state: { phase: 'SAVED', retries: 0 }, speak: m.saved, save, newEmployer };
}

function handleConfirm(state: DialogueState, text: string, ctx: DialogueCtx, parsed?: Intent): StepResult {
  const m = messages(ctx.lang);
  const draft = state.draft!;
  const again = (prefix = ''): StepResult => ({ state: { ...state, retries: 0 }, speak: prefix + m.readBack(draft, ctx.today) });

  const intent =
    parsed ??
    parseUtterance(text, {
      today: ctx.today,
      employers: ctx.employers.map((e) => e.name),
      lang: ctx.lang,
    });

  switch (intent.kind) {
    case 'confirm':
      return commit(state, ctx);
    case 'deny': {
      const n = parseNumber(text);
      if (n === null) return { state: initialState, speak: m.discarded };
      const corrected = withTranscript({ ...draft, amount: n }, text);
      if (!validateDraft(corrected, text, ctx.today).ok) return again(`${m.unclearAmount} `);
      return { state: { phase: 'CONFIRM', draft: corrected, retries: 0 }, speak: m.readBack(corrected, ctx.today) };
    }
    case 'record':
      return handleFresh(text, ctx, intent);
    default:
      return again();
  }
}

/**
 * Pure dialogue reducer. A `save` is produced only from a CONFIRM state by an explicit
 * confirmation (spoken yes or tap_yes); no other path can produce one.
 */
export function step(state: DialogueState, ev: DialogueEvent, ctx: DialogueCtx): StepResult {
  const m = messages(ctx.lang);
  switch (ev.type) {
    case 'reset':
      return { state: initialState };
    case 'tap_yes':
      return state.phase === 'CONFIRM' ? commit(state, ctx) : { state };
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

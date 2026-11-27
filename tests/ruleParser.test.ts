import { describe, it, expect } from 'vitest';
import { parseUtterance, missingFields } from '../src/nlu/ruleParser';
import type { Intent } from '../src/domain/types';

const today = '2026-11-27';
const ctx = { today, employers: [] as string[], lang: 'en-IN' as const };

type Rec = { kind: 'record'; type?: string; employerName?: string; amount?: number; hours?: number; date?: string };
type Qry = { kind: 'query'; q: string; employerName?: string; period?: string };
type Simple = { kind: 'confirm' | 'deny' | 'unknown' };
type Case = [string, Rec | Qry | Simple];

const cases: Case[] = [
  // ---- English ----
  ["I worked at Ramesh's construction site today for 700 rupees", { kind: 'record', type: 'work', employerName: 'Ramesh', amount: 700, date: today }],
  ['I worked at Suresh site yesterday for 800 rupees', { kind: 'record', type: 'work', employerName: 'Suresh', amount: 800, date: '2026-11-26' }],
  ['worked for Mahesh today 650', { kind: 'record', type: 'work', employerName: 'Mahesh', amount: 650, date: today }],
  ['I worked two extra hours yesterday', { kind: 'record', type: 'overtime', hours: 2, date: '2026-11-26' }],
  ['I did 3 hours overtime at Ramesh today', { kind: 'record', type: 'overtime', hours: 3, employerName: 'Ramesh' }],
  ['The contractor gave me 1000 rupees advance', { kind: 'record', type: 'advance', amount: 1000 }],
  ['Ramesh gave me 1,000 rupees advance', { kind: 'record', type: 'advance', amount: 1000, employerName: 'Ramesh' }],
  ['I received 500 rupees from Ramesh', { kind: 'record', type: 'payment', amount: 500, employerName: 'Ramesh' }],
  ['Suresh paid me seven hundred rupees today', { kind: 'record', type: 'payment', amount: 700, employerName: 'Suresh' }],
  ['How much does Ramesh still owe me?', { kind: 'query', q: 'owed', employerName: 'Ramesh' }],
  ['How much have I earned this month?', { kind: 'query', q: 'earned', period: 'month' }],
  ['How many days did I work at Ramesh', { kind: 'query', q: 'days', employerName: 'Ramesh' }],
  ['How much advance have I taken', { kind: 'query', q: 'advances' }],
  ['yes', { kind: 'confirm' }],
  ['okay', { kind: 'confirm' }],
  ['no', { kind: 'deny' }],
  ['no, 800', { kind: 'deny' }],
  // ---- Hindi / Hinglish ----
  ['Aaj Ramesh ke site pe 700 rupaye kaam kiya', { kind: 'record', type: 'work', employerName: 'Ramesh', amount: 700, date: today }],
  ['Kal Suresh ke yahan saat sau rupaye kaam kiya', { kind: 'record', type: 'work', employerName: 'Suresh', amount: 700, date: '2026-11-26' }],
  ['Ramesh ne mujhe ek hazaar rupaye advance diye', { kind: 'record', type: 'advance', employerName: 'Ramesh', amount: 1000 }],
  ['Ramesh ne 500 rupaye diye', { kind: 'record', type: 'payment', employerName: 'Ramesh', amount: 500 }],
  ['Maine aaj do ghante extra kaam kiya', { kind: 'record', type: 'overtime', hours: 2, date: today }],
  ['Ramesh ne kitna dena hai?', { kind: 'query', q: 'owed', employerName: 'Ramesh' }],
  ['Is mahine kitna kamaya?', { kind: 'query', q: 'earned', period: 'month' }],
  ['Ramesh ke yahan kitne din kaam kiya', { kind: 'query', q: 'days', employerName: 'Ramesh' }],
  ['haan', { kind: 'confirm' }],
  ['nahi', { kind: 'deny' }],
  ['theek hai', { kind: 'confirm' }],
  // ---- Devanagari ----
  ['आज रमेश के साइट पर सात सौ रुपये काम किया', { kind: 'record', type: 'work', employerName: 'रमेश', amount: 700, date: today }],
  ['आज रमेश के साइट पर ७०० रुपये काम किया', { kind: 'record', type: 'work', employerName: 'रमेश', amount: 700 }],
  ['रमेश ने कितना देना है?', { kind: 'query', q: 'owed', employerName: 'रमेश' }],
  ['हाँ', { kind: 'confirm' }],
  ['नहीं', { kind: 'deny' }],
  // ---- Kannada ----
  ['ಇವತ್ತು ರಮೇಶ್ ಅವರ ಸೈಟ್‌ನಲ್ಲಿ ಏಳುನೂರು ರೂಪಾಯಿ ಕೆಲಸ ಮಾಡಿದೆ', { kind: 'record', type: 'work', employerName: 'ರಮೇಶ್', amount: 700, date: today }],
  ['ರಮೇಶ್ ಅವರು ನನಗೆ ಎಷ್ಟು ಕೊಡಬೇಕು?', { kind: 'query', q: 'owed', employerName: 'ರಮೇಶ್' }],
  ['ಹೌದು', { kind: 'confirm' }],
  ['ಇಲ್ಲ', { kind: 'deny' }],
  // ---- Mixed Kannada + English ----
  ['Ramesh avara site alli ಇವತ್ತು 700 rupees kelasa madide', { kind: 'record', type: 'work', employerName: 'Ramesh', amount: 700, date: today }],
  // ---- Honorifics: the name is the word before "bhai / sir / anna ..." ----
  ['aaj ka kaam 700 Mahesh bhai ne diya', { kind: 'record', type: 'payment', employerName: 'Mahesh', amount: 700 }],
  ['ramesh anna kitchen 700 worked today', { kind: 'record', type: 'work', employerName: 'Ramesh', amount: 700, date: today }],
  ['Ramesh sir gave me some money yesterday', { kind: 'record', type: 'payment', employerName: 'Ramesh', date: '2026-11-26' }],
  ['Suresh bhaiya ne 500 rupaye diye', { kind: 'record', type: 'payment', employerName: 'Suresh', amount: 500 }],
  ['सुरेश भाई ने 500 रुपये दिए', { kind: 'record', type: 'payment', employerName: 'सुरेश', amount: 500 }],
  ['ರಮೇಶ್ ಅಣ್ಣ ಅವರ ಸೈಟ್‌ನಲ್ಲಿ 700 ರೂಪಾಯಿ ಕೆಲಸ ಮಾಡಿದೆ', { kind: 'record', type: 'work', employerName: 'ರಮೇಶ್', amount: 700 }],
  // ---- Not understood ----
  ['hello there', { kind: 'unknown' }],
  ['', { kind: 'unknown' }],
];

describe('parseUtterance table', () => {
  it.each(cases)('%s', (text, expected) => {
    const got = parseUtterance(text, ctx);
    if (expected.kind === 'record') {
      const { kind, ...want } = expected;
      expect(got.kind).toBe(kind);
      expect((got as Extract<Intent, { kind: 'record' }>).draft).toMatchObject(want);
    } else if (expected.kind === 'query') {
      expect(got).toMatchObject(expected);
    } else {
      expect(got.kind).toBe(expected.kind);
    }
  });

  it('the table has at least 30 utterances', () => {
    expect(cases.length).toBeGreaterThanOrEqual(30);
  });
});

describe('parseUtterance details', () => {
  it('an honorific on its own is never the employer', () => {
    const r = parseUtterance('bhai ne 500 rupaye diye', ctx);
    expect(r.kind).toBe('record');
    if (r.kind === 'record') expect(r.draft.employerName).toBeUndefined();
  });
  it('"yes sir" is still just a confirmation', () => {
    expect(parseUtterance('yes sir', ctx).kind).toBe('confirm');
  });
  it('an advance with no employer asks for one', () => {
    const r = parseUtterance('The contractor gave me 1000 rupees advance', ctx);
    expect(r.kind).toBe('record');
    if (r.kind === 'record') expect(missingFields(r.draft)).toContain('employer');
  });
  it('an amount with no type asks for the type', () => {
    const r = parseUtterance('700 rupees', ctx);
    expect(r.kind).toBe('record');
    if (r.kind === 'record') {
      expect(r.draft.amount).toBe(700);
      expect(missingFields(r.draft)).toContain('type');
    }
  });
  it('overtime with hours but no amount is missing the amount', () => {
    const r = parseUtterance('I worked two extra hours yesterday', ctx);
    expect(r.kind).toBe('record');
    if (r.kind === 'record') expect(missingFields(r.draft)).toEqual(expect.arrayContaining(['employer', 'amount']));
  });
  it('defaults the date to today when none is spoken', () => {
    const r = parseUtterance('Ramesh ne 500 rupaye diye', ctx);
    expect(r.kind).toBe('record');
    if (r.kind === 'record') expect(r.draft.date).toBe(today);
  });
  it('keeps the raw transcript and language on the draft', () => {
    const r = parseUtterance('Ramesh ne 500 rupaye diye', { ...ctx, lang: 'hi-IN' });
    expect(r.kind).toBe('record');
    if (r.kind === 'record') expect(r.draft).toMatchObject({ rawTranscript: 'Ramesh ne 500 rupaye diye', lang: 'hi-IN' });
  });
  it('maps a slightly misheard name to the known employer', () => {
    const r = parseUtterance('Rameshh ne 500 rupaye diye', { ...ctx, employers: ['Ramesh'] });
    expect(r.kind).toBe('record');
    if (r.kind === 'record') expect(r.draft.employerName).toBe('Ramesh');
  });
  it('does NOT map a different name (Mahesh) onto Ramesh', () => {
    const r = parseUtterance('Mahesh ne 500 rupaye diye', { ...ctx, employers: ['Ramesh'] });
    expect(r.kind).toBe('record');
    if (r.kind === 'record') expect(r.draft.employerName).toBe('Mahesh');
  });
  it('keeps the spoken name when two known employers share it, so the query can flag ambiguity', () => {
    const r = parseUtterance('How much does Ramesh owe me', { ...ctx, employers: ['Ramesh Kumar', 'Ramesh Gowda'] });
    expect(r).toMatchObject({ kind: 'query', q: 'owed', employerName: 'Ramesh' });
  });
  it('how much do I owe is a query, not the number two', () => {
    const r = parseUtterance('How much do I owe', ctx);
    expect(r.kind).toBe('query');
  });
  it('refuses an utterance that mixes two money amounts, so the app asks for one entry at a time', () => {
    const r = parseUtterance('I worked at Ramesh today for 700 rupees and Suresh paid 200', ctx);
    expect(r.kind).toBe('unknown');
  });
  it('a spoken compound amount is still one amount', () => {
    const r = parseUtterance('ek hazaar paanch sau rupaye mile Ramesh se', ctx);
    expect(r.kind).toBe('record');
    if (r.kind === 'record') expect(r.draft.amount).toBe(1500);
  });
  it('recognises "have to pay me" and "lena hai" as owed queries', () => {
    expect(parseUtterance('how much money does Suresh have to pay me', ctx)).toMatchObject({ kind: 'query', q: 'owed', employerName: 'Suresh' });
    expect(parseUtterance('Mujhe Ramesh se kitna lena hai', ctx)).toMatchObject({ kind: 'query', q: 'owed', employerName: 'Ramesh' });
  });
});

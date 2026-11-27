import { describe, it, expect } from 'vitest';
import { parseDays, isPerDay } from '../src/nlu/normalize';
import { parseUtterance } from '../src/nlu/ruleParser';
import { lastNDays } from '../src/domain/dates';

const today = '2026-11-27';
const ctx = { today, employers: ['Ramesh', 'Suresh'], lang: 'hi-IN' as const };

describe('parseDays', () => {
  it.each([
    ['Ramesh ke yahan 3 din kaam kiya', 3],
    ['teen din kaam kiya', 3],
    ['do din kaam kiya', 2],
    ['I worked 5 days at Ramesh', 5],
    ['रमेश के यहाँ तीन दिन काम किया', 3],
    ['ರಮೇಶ್ ಅವರ ಬಳಿ ಮೂರು ದಿನ ಕೆಲಸ ಮಾಡಿದೆ', 3],
  ])('%s -> %d', (text, n) => expect(parseDays(text)).toBe(n));

  it.each(['ek din kaam kiya', 'Ramesh ne 500 diye', '40 din', '0 days'])('%s -> null (not a multi-day count)', (text) => {
    expect(parseDays(text)).toBeNull();
  });
});

describe('isPerDay', () => {
  it.each(['3 din 700 roz', '700 per day', '700 daily', 'रोज़ 700', 'ಪ್ರತಿದಿನ 700', '3 दिन का 700'])('%s is per day', (t) => {
    expect(isPerDay(t)).toBe(true);
  });
  it.each(['3 din kaam kiya 2100', 'रमेश के यहाँ 3 दिन काम किया'])('%s is not per day', (t) => {
    expect(isPerDay(t)).toBe(false);
  });
});

describe('lastNDays', () => {
  it('lists N consecutive days ending on the given date, oldest first', () => {
    expect(lastNDays('2026-11-27', 3)).toEqual(['2026-11-25', '2026-11-26', '2026-11-27']);
    expect(lastNDays('2026-12-01', 2)).toEqual(['2026-11-30', '2026-12-01']);
  });
});

describe('multi-day records', () => {
  it('"3 din kaam kiya" is a 3-day work record with no amount', () => {
    const r = parseUtterance('Ramesh ke yahan 3 din kaam kiya', ctx);
    expect(r).toMatchObject({ kind: 'record', draft: { type: 'work', days: 3, employerName: 'Ramesh' } });
    if (r.kind === 'record') expect(r.draft.amount).toBeUndefined();
  });
  it('a day count with no work word still means work', () => {
    expect(parseUtterance('Ramesh ke yahan 3 din', ctx)).toMatchObject({ kind: 'record', draft: { type: 'work', days: 3 } });
  });
  it('keeps the spoken total and marks per-day phrasing', () => {
    expect(parseUtterance('Ramesh ke yahan 3 din kaam kiya 2100', ctx)).toMatchObject({ draft: { days: 3, amount: 2100, perDay: false } });
    expect(parseUtterance('Ramesh ke yahan 3 din kaam kiya 700 roz', ctx)).toMatchObject({ draft: { days: 3, amount: 700, perDay: true } });
  });
  it('does not add days to a single-day record', () => {
    const r = parseUtterance('Aaj Ramesh ke site pe 700 rupaye kaam kiya', ctx);
    if (r.kind === 'record') expect(r.draft.days).toBeUndefined();
  });
});

describe('voice commands', () => {
  it.each([
    ['Ramesh ka hisab dikhao', 'statement', 'Ramesh'],
    ['रमेश का हिसाब दिखाओ', 'statement', 'रमेश'],
    ['ರಮೇಶ್ ಅವರ ಲೆಕ್ಕ ತೋರಿಸಿ', 'statement', 'ರಮೇಶ್'],
    ['show Ramesh statement', 'statement', 'Ramesh'],
    ['Ramesh ko yaad dilao', 'remind', 'Ramesh'],
    ['रमेश को याद दिलाओ', 'remind', 'रमेश'],
    ['ರಮೇಶ್ ಅವರಿಗೆ ನೆನಪಿಸು', 'remind', 'ರಮೇಶ್'],
    ['remind Suresh', 'remind', 'Suresh'],
  ])('%s -> %s for %s', (text, cmd, name) => {
    expect(parseUtterance(text, ctx)).toMatchObject({ kind: 'command', cmd, employerName: name });
  });

  it.each(['aakhri entry hatao', 'आखिरी एंट्री हटाओ', 'ಕೊನೆಯ ದಾಖಲೆ ಅಳಿಸಿ', 'delete last entry', 'undo'])('%s -> undo', (text) => {
    expect(parseUtterance(text, ctx)).toMatchObject({ kind: 'command', cmd: 'undo' });
  });

  it.each([
    ['Ramesh ka rate 750 hai', 'Ramesh', 750],
    ['रमेश का रेट 750 है', 'रमेश', 750],
    ['ರಮೇಶ್ ಅವರ ರೇಟ್ 750', 'ರಮೇಶ್', 750],
    ["set Suresh's rate to 650", 'Suresh', 650],
  ])('%s -> set_rate', (text, name, amount) => {
    expect(parseUtterance(text, ctx)).toMatchObject({ kind: 'command', cmd: 'set_rate', employerName: name, amount });
  });

  it('a work entry that says "roz" is still a record, not a rate command', () => {
    expect(parseUtterance('Ramesh ke yahan 3 din kaam kiya 700 roz', ctx).kind).toBe('record');
  });
  it('the existing questions still work', () => {
    expect(parseUtterance('Ramesh ne kitna dena hai?', ctx)).toMatchObject({ kind: 'query', q: 'owed' });
    expect(parseUtterance('Ramesh ke yahan kitne din kaam kiya', ctx)).toMatchObject({ kind: 'query', q: 'days' });
  });
});

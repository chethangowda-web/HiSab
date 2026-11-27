import { describe, it, expect } from 'vitest';
import { EXAMPLES } from '../src/i18n/examples';
import { parseUtterance, missingFields } from '../src/nlu/ruleParser';
import type { Lang } from '../src/domain/types';

const today = '2026-11-27';

describe.each<Lang>(['en-IN', 'hi-IN', 'kn-IN'])('"You can say" examples (%s)', (lang) => {
  const ctx = { today, employers: [] as string[], lang };
  const [work, advance, question] = EXAMPLES[lang];

  it('shows three examples', () => {
    expect(EXAMPLES[lang]).toHaveLength(3);
  });
  it('the work example is understood completely', () => {
    const r = parseUtterance(work, ctx);
    expect(r.kind).toBe('record');
    if (r.kind === 'record') {
      expect(r.draft).toMatchObject({ type: 'work', amount: 700 });
      expect(missingFields(r.draft)).toEqual([]);
    }
  });
  it('the advance example is understood completely', () => {
    const r = parseUtterance(advance, ctx);
    expect(r.kind).toBe('record');
    if (r.kind === 'record') {
      expect(r.draft).toMatchObject({ type: 'advance', amount: 1000 });
      expect(missingFields(r.draft)).toEqual([]);
    }
  });
  it('the question example is understood as "how much is owed"', () => {
    expect(parseUtterance(question, ctx)).toMatchObject({ kind: 'query', q: 'owed' });
  });
});

describe('advance written the way speech recognition spells it', () => {
  const ctx = { today, employers: [] as string[], lang: 'hi-IN' as const };
  it.each([
    ['रमेश ने 1000 रुपये एडवांस दिया', 'Devanagari "advance"'],
    ['रमेश ने 1000 रुपये अडवांस दिया', 'alternate spelling'],
    ['ರಮೇಶ್ ಅವರು 1000 ರೂಪಾಯಿ ಅಡ್ವಾನ್ಸ್ ಕೊಟ್ಟರು', 'Kannada "advance"'],
  ])('%s (%s)', (text) => {
    const r = parseUtterance(text, ctx);
    expect(r.kind).toBe('record');
    if (r.kind === 'record') expect(r.draft.type).toBe('advance');
  });
  it('asking about advances in Devanagari is a query', () => {
    expect(parseUtterance('रमेश से कितना एडवांस लिया?', ctx)).toMatchObject({ kind: 'query', q: 'advances' });
  });
});

describe.each<Lang>(['en-IN', 'hi-IN', 'kn-IN'])('voice command examples (%s)', (lang) => {
  const ctx = { today, employers: [] as string[], lang };
  it('each shown command parses as the intended command', async () => {
    const { COMMAND_EXAMPLES } = await import('../src/i18n/examples');
    const [statement, remind, undo, rate] = COMMAND_EXAMPLES[lang];
    expect(parseUtterance(statement, ctx)).toMatchObject({ kind: 'command', cmd: 'statement' });
    expect(parseUtterance(remind, ctx)).toMatchObject({ kind: 'command', cmd: 'remind' });
    expect(parseUtterance(undo, ctx)).toMatchObject({ kind: 'command', cmd: 'undo' });
    expect(parseUtterance(rate, ctx)).toMatchObject({ kind: 'command', cmd: 'set_rate', amount: 750 });
  });
});

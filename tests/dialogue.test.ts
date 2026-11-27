import { describe, it, expect } from 'vitest';
import { step, initialState, type DialogueCtx, type DialogueEvent, type DialogueState, type StepResult } from '../src/voice/dialogue';
import { messages } from '../src/i18n/messages';
import type { Employer, Entry, Lang } from '../src/domain/types';

const today = '2026-11-27';

function makeCtx(over: Partial<DialogueCtx> = {}): DialogueCtx {
  let n = 0;
  return {
    today,
    lang: 'en-IN',
    employers: [{ id: 'r1', name: 'Ramesh' }],
    entries: [],
    newId: () => `id${++n}`,
    now: () => 1000,
    ...over,
  };
}

const heard = (text: string, confidence = 0.9): DialogueEvent => ({ type: 'heard', text, confidence });

function run(events: DialogueEvent[], ctx = makeCtx()): { last: StepResult; all: StepResult[] } {
  let state: DialogueState = initialState;
  const all: StepResult[] = [];
  for (const ev of events) {
    const r = step(state, ev, ctx);
    all.push(r);
    state = r.state;
  }
  return { last: all[all.length - 1], all };
}

const m = messages('en-IN');

describe('low confidence', () => {
  it('asks to repeat and keeps state', () => {
    const { last } = run([heard('I worked at Ramesh for 700', 0.4)]);
    expect(last.speak).toBe(m.repeat);
    expect(last.state.phase).toBe('IDLE');
    expect(last.save).toBeUndefined();
  });
  it('suggests typing after two failed retries', () => {
    const { all } = run([heard('x', 0.2), heard('x', 0.2), heard('x', 0.2)]);
    expect(all[0].speak).toBe(m.repeat);
    expect(all[1].speak).toBe(m.repeat);
    expect(all[2].speak).toBe(m.fallbackHint);
    expect(all[2].needTyping).toBe(true);
  });
  it('a good hearing resets the retry count', () => {
    const { all } = run([heard('x', 0.2), heard('x', 0.2), heard('hello there', 0.9), heard('x', 0.2)]);
    expect(all[3].speak).toBe(m.repeat);
  });
  it('treats empty text as not heard', () => {
    expect(run([heard('   ', 0.95)]).last.speak).toBe(m.repeat);
  });
});

describe('clarify then confirm', () => {
  it('asks for a missing employer, then reads back', () => {
    const { all } = run([heard('The contractor gave me 1000 rupees advance'), heard('Ramesh')]);
    expect(all[0].state.phase).toBe('CLARIFY');
    expect(all[0].state.asking).toBe('employer');
    expect(all[0].speak).toBe(m.clarify('employer'));
    expect(all[1].state.phase).toBe('CONFIRM');
    expect(all[1].speak).toContain('Ramesh');
    expect(all[1].speak).toContain('1000');
  });
  it('asks for a missing amount and accepts it spoken as words', () => {
    const { all } = run([heard('I worked at Ramesh today'), heard('seven hundred')]);
    expect(all[0].state.asking).toBe('amount');
    expect(all[1].state.phase).toBe('CONFIRM');
    expect(all[1].speak).toContain('700');
  });
  it('re-asks when the amount answer is not a number', () => {
    const { all } = run([heard('I worked at Ramesh today'), heard('hello')]);
    expect(all[1].state.phase).toBe('CLARIFY');
    expect(all[1].state.asking).toBe('amount');
  });
  it('re-asks when the amount answer is out of range', () => {
    const { all } = run([heard('I worked at Ramesh today'), heard('0')]);
    expect(all[1].state.phase).toBe('CLARIFY');
  });
  it('asks for a missing type first, then the employer', () => {
    const { all } = run([heard('700 rupees'), heard('advance')]);
    expect(all[0].state.asking).toBe('type');
    expect(all[1].state.asking).toBe('employer');
  });
  it('overtime in hours with no amount asks for the amount', () => {
    const { all } = run([heard('I worked two extra hours at Ramesh')]);
    expect(all[0].state.asking).toBe('amount');
  });
});

describe('employers', () => {
  const twoRameshes: Employer[] = [
    { id: 'a', name: 'Ramesh Kumar' },
    { id: 'b', name: 'Ramesh Gowda' },
  ];
  it('asks which one when two employers share a name, and uses the chosen one', () => {
    const ctx = makeCtx({ employers: twoRameshes });
    const { all } = run([heard('Ramesh ne 500 rupaye diye'), heard('Ramesh Gowda'), { type: 'tap_yes' }], ctx);
    expect(all[0].state.phase).toBe('CLARIFY');
    expect(all[0].speak).toContain('Ramesh Kumar');
    expect(all[0].speak).toContain('Ramesh Gowda');
    expect(all[1].state.phase).toBe('CONFIRM');
    expect(all[2].save?.employerId).toBe('b');
  });
  it('accepts just the surname to disambiguate', () => {
    const ctx = makeCtx({ employers: twoRameshes });
    const { all } = run([heard('Ramesh ne 500 rupaye diye'), heard('Kumar'), { type: 'tap_yes' }], ctx);
    expect(all[2].save?.employerId).toBe('a');
  });
  it('creates a new employer for an unknown name', () => {
    const { last } = run([heard('Mahesh ne 500 rupaye diye'), { type: 'tap_yes' }]);
    expect(last.newEmployer?.name).toBe('Mahesh');
    expect(last.save?.employerId).toBe(last.newEmployer?.id);
  });
  it('reuses an existing employer instead of creating one', () => {
    const { last } = run([heard('Ramesh ne 500 rupaye diye'), { type: 'tap_yes' }]);
    expect(last.newEmployer).toBeUndefined();
    expect(last.save?.employerId).toBe('r1');
  });
});

describe('saving', () => {
  it('tap_yes in CONFIRM saves a worker-recorded entry', () => {
    const { last } = run([heard('The contractor gave me 1000 rupees advance'), heard('Ramesh'), { type: 'tap_yes' }]);
    expect(last.state.phase).toBe('SAVED');
    expect(last.speak).toBe(m.saved);
    expect(last.save).toMatchObject<Partial<Entry>>({
      employerId: 'r1',
      type: 'advance',
      amount: 1000,
      date: today,
      source: 'worker',
      lang: 'en-IN',
      createdAt: 1000,
    });
    expect(last.save?.rawTranscript).toContain('1000 rupees advance');
  });
  it('spoken yes also saves', () => {
    const { last } = run([heard('Ramesh ne 500 rupaye diye'), heard('haan')]);
    expect(last.save?.amount).toBe(500);
  });
  it('a spoken correction re-reads back the new amount, and saves only that', () => {
    const { all } = run([heard('Ramesh ne 500 rupaye diye'), heard('nahi, 800'), heard('yes')]);
    expect(all[1].state.phase).toBe('CONFIRM');
    expect(all[1].speak).toContain('800');
    expect(all[1].save).toBeUndefined();
    expect(all[2].save?.amount).toBe(800);
  });
  it('a plain no discards the draft', () => {
    const { all } = run([heard('Ramesh ne 500 rupaye diye'), heard('no')]);
    expect(all[1].state.phase).toBe('IDLE');
    expect(all[1].speak).toBe(m.discarded);
    expect(all[1].save).toBeUndefined();
  });
  it('tap_no discards the draft', () => {
    const { all } = run([heard('Ramesh ne 500 rupaye diye'), { type: 'tap_no' }]);
    expect(all[1].state.phase).toBe('IDLE');
    expect(all[1].save).toBeUndefined();
  });
  it('an unrelated sentence while confirming re-reads the entry instead of saving', () => {
    const { all } = run([heard('Ramesh ne 500 rupaye diye'), heard('hello there')]);
    expect(all[1].state.phase).toBe('CONFIRM');
    expect(all[1].save).toBeUndefined();
  });
  it('a new full sentence while confirming replaces the draft', () => {
    const { all } = run([heard('Ramesh ne 500 rupaye diye'), heard('Ramesh ne 900 rupaye diye'), heard('yes')]);
    expect(all[2].save?.amount).toBe(900);
  });
  it('can record again right after a save', () => {
    const { last } = run([heard('Ramesh ne 500 rupaye diye'), heard('yes'), heard('Ramesh ne 300 rupaye diye'), heard('yes')]);
    expect(last.save?.amount).toBe(300);
  });
});

describe('never saves without an explicit confirm', () => {
  const sequences: DialogueEvent[][] = [
    [heard('Ramesh ne 500 rupaye diye')],
    [heard('Ramesh ne 500 rupaye diye'), heard('no')],
    [heard('Ramesh ne 500 rupaye diye'), { type: 'tap_no' }],
    [heard('Ramesh ne 500 rupaye diye'), heard('hello there'), heard('Ramesh ne 500 rupaye diye', 0.1)],
    [{ type: 'tap_yes' }],
    [heard('yes')],
    [heard('I worked at Ramesh today'), { type: 'tap_yes' }],
    [heard('I worked at Ramesh today'), heard('700')],
    [heard('The contractor gave me 1000 rupees advance'), { type: 'tap_yes' }, heard('yes')],
    [heard('I worked at Ramesh for 700 and Suresh paid 200'), heard('yes')],
  ];
  it.each(sequences.map((s, i) => [i, s] as const))('sequence %i produces no save', (_i, events) => {
    const { all } = run([...events]);
    expect(all.every((r) => r.save === undefined)).toBe(true);
  });
});

describe('queries', () => {
  const entries: Entry[] = [
    { id: 'e1', employerId: 'r1', type: 'work', amount: 700, date: '2026-11-25', source: 'worker', rawTranscript: '', lang: 'en-IN', createdAt: 0 },
    { id: 'e2', employerId: 'r1', type: 'work', amount: 700, date: '2026-11-26', source: 'worker', rawTranscript: '', lang: 'en-IN', createdAt: 0 },
    { id: 'e3', employerId: 'r1', type: 'advance', amount: 1000, date: '2026-11-26', source: 'worker', rawTranscript: '', lang: 'en-IN', createdAt: 0 },
    { id: 'e4', employerId: 'r1', type: 'payment', amount: 200, date: '2026-11-27', source: 'worker', rawTranscript: '', lang: 'en-IN', createdAt: 0 },
  ];
  it('speaks the balance without saving or changing phase', () => {
    const { last } = run([heard('How much does Ramesh still owe me?')], makeCtx({ entries }));
    expect(last.speak).toContain('200');
    expect(last.speak).toContain('Ramesh');
    expect(last.state.phase).toBe('IDLE');
    expect(last.save).toBeUndefined();
  });
  it('speaks this month earnings', () => {
    const { last } = run([heard('How much have I earned this month?')], makeCtx({ entries }));
    expect(last.speak).toContain('1400');
  });
  it('says nothing is pending when the balance is zero', () => {
    const { last } = run([heard('How much does Ramesh owe me?')], makeCtx({ entries: entries.slice(0, 1).concat({ ...entries[3], amount: 700 }) }));
    expect(last.speak).toBe(m.answer({ key: 'owed', amount: 0, employerName: 'Ramesh' }));
  });
  it('reports an unknown employer', () => {
    const { last } = run([heard('How much does Mahesh owe me?')], makeCtx({ entries }));
    expect(last.speak).toContain('Mahesh');
  });
  it('flags two employers with the same name instead of guessing', () => {
    const ctx = makeCtx({ employers: [{ id: 'a', name: 'Ramesh Kumar' }, { id: 'b', name: 'Ramesh Gowda' }] });
    const { last } = run([heard('How much does Ramesh owe me?')], ctx);
    expect(last.speak).toBe(m.answer({ key: 'ambiguous_employer', employerName: 'Ramesh' }));
  });
});

describe('not understood', () => {
  it('replies with an example for gibberish', () => {
    const { last } = run([heard('what is the weather')]);
    expect(last.speak).toBe(m.notUnderstood);
    expect(last.state.phase).toBe('IDLE');
  });
  it('refuses a sentence with two amounts', () => {
    const { last } = run([heard('I worked at Ramesh for 700 and Suresh paid 200')]);
    expect(last.speak).toBe(m.notUnderstood);
  });
});

describe('languages', () => {
  it.each<Lang>(['en-IN', 'hi-IN', 'kn-IN'])('%s read-back contains employer and amount', (lang) => {
    const text = messages(lang).readBack({ type: 'work', employerName: 'Ramesh', amount: 700, date: today }, today);
    expect(text).toContain('Ramesh');
    expect(text).toContain('700');
  });
  it('hindi read-back is in Devanagari', () => {
    expect(messages('hi-IN').readBack({ type: 'payment', employerName: 'Ramesh', amount: 500, date: today }, today)).toMatch(/[ऀ-ॿ]/);
  });
  it('kannada read-back is in Kannada script', () => {
    expect(messages('kn-IN').readBack({ type: 'payment', employerName: 'Ramesh', amount: 500, date: today }, today)).toMatch(/[ಀ-೿]/);
  });
  it('answers a query in the chosen language', () => {
    const { last } = run([heard('Ramesh ne kitna dena hai?')], makeCtx({ lang: 'hi-IN' }));
    expect(last.speak).toMatch(/[ऀ-ॿ]/);
  });
  it('says yesterday and older dates in words', () => {
    const y = messages('en-IN').readBack({ type: 'work', employerName: 'Ramesh', amount: 700, date: '2026-11-26' }, today);
    expect(y).toContain('yesterday');
    const old = messages('en-IN').readBack({ type: 'work', employerName: 'Ramesh', amount: 700, date: '2026-11-20' }, today);
    expect(old).toContain('20 November');
  });
  it('reads hours for overtime', () => {
    const t = messages('en-IN').readBack({ type: 'overtime', employerName: 'Ramesh', amount: 150, hours: 2, date: today }, today);
    expect(t).toContain('2 hours');
  });
});

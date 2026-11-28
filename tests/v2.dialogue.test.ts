import { describe, it, expect } from 'vitest';
import { step, initialState, type DialogueCtx, type DialogueEvent, type DialogueState, type StepResult } from '../src/voice/dialogue';
import type { Employer, Entry } from '../src/domain/types';

const today = '2026-11-27';
const yes: DialogueEvent = { type: 'tap_yes' };
const no: DialogueEvent = { type: 'tap_no' };
const heard = (text: string): DialogueEvent => ({ type: 'heard', text, confidence: 0.9 });

const entry = (p: Partial<Entry>): Entry => ({
  id: 'e1', employerId: 'r1', type: 'work', amount: 700, date: '2026-11-26', source: 'worker', rawTranscript: '', lang: 'en-IN', createdAt: 1, ...p,
});

function makeCtx(over: Partial<DialogueCtx> = {}): DialogueCtx {
  let n = 0;
  return {
    today, lang: 'en-IN',
    employers: [{ id: 'r1', name: 'Ramesh', dailyRate: 700 }, { id: 's1', name: 'Suresh' }],
    entries: [], newId: () => `id${++n}`, now: () => 1000, ...over,
  };
}
function run(events: DialogueEvent[], ctx = makeCtx()): StepResult[] {
  let state: DialogueState = initialState;
  return events.map((ev) => {
    const r = step(state, ev, ctx);
    state = r.state;
    return r;
  });
}

describe('remembered daily rate', () => {
  it('fills the usual rate when no amount is said, and saves directly', () => {
    const [r1] = run([heard('Aaj Ramesh ke yahan kaam kiya')]);
    expect(r1.state.phase).toBe('SAVED');
    expect(r1.save).toMatchObject({ employerId: 'r1', amount: 700, type: 'work' });
  });

  it('asks for the amount when the employer has no rate yet', () => {
    const [r1] = run([heard('Aaj Suresh ke yahan kaam kiya')]);
    expect(r1.state).toMatchObject({ phase: 'CLARIFY', asking: 'amount' });
  });

  it('learns the rate from the first spoken work amount for an employer without one', () => {
    const [r1] = run([heard('Aaj Suresh ke yahan 650 rupaye kaam kiya')]);
    expect(r1.updateEmployer).toEqual({ id: 's1', dailyRate: 650 });
  });

  it('a new employer gets the rate from their first work entry', () => {
    const [r1] = run([heard('Aaj Mahesh ke yahan 600 rupaye kaam kiya')]);
    expect(r1.newEmployer).toMatchObject({ name: 'Mahesh', dailyRate: 600 });
  });

  it('does not overwrite an existing rate with a one-off amount', () => {
    const [r1] = run([heard('Aaj Ramesh ke yahan 800 rupaye kaam kiya')]);
    expect(r1.updateEmployer).toBeUndefined();
    expect(r1.save?.amount).toBe(800);
  });

  it('payments never teach a rate', () => {
    const [r1] = run([heard('Suresh ne 500 rupaye diye')]);
    expect(r1.updateEmployer).toBeUndefined();
  });
});

describe('several days in one sentence', () => {
  it('3 days at the usual rate become 3 dated entries', () => {
    const [r1] = run([heard('Ramesh ke yahan 3 din kaam kiya')]);
    expect(r1.state.phase).toBe('SAVED');
    expect(r1.saves?.map((s) => s.date)).toEqual(['2026-11-25', '2026-11-26', '2026-11-27']);
    expect(r1.saves?.every((s) => s.amount === 700 && s.employerId === 'r1' && s.type === 'work')).toBe(true);
    expect(new Set(r1.saves?.map((s) => s.id)).size).toBe(3);
    expect(r1.save).toEqual(r1.saves?.[0]);
  });

  it('a spoken total is split evenly', () => {
    const [r1] = run([heard('Suresh ke yahan 3 din kaam kiya 2100')]);
    expect(r1.saves).toHaveLength(3);
    expect(r1.saves?.every((s) => s.amount === 700)).toBe(true);
  });

  it('a total that does not split evenly asks for the per-day amount instead of rounding', () => {
    const [r1, r2] = run([heard('Suresh ke yahan 3 din kaam kiya 2000'), heard('650')]);
    expect(r1.state).toMatchObject({ phase: 'CLARIFY', asking: 'amount' });
    expect(r1.speak).toMatch(/per day/i);
    expect(r2.state.phase).toBe('SAVED');
    expect(r2.saves?.every((s) => s.amount === 650)).toBe(true);
  });

  it('"700 roz" is per day', () => {
    const [r1] = run([heard('Suresh ke yahan 3 din kaam kiya 700 roz')]);
    expect(r1.saves).toHaveLength(3);
    expect(r1.saves?.every((s) => s.amount === 700)).toBe(true);
  });

  it('no rate and no amount: asks per day', () => {
    const [r1] = run([heard('Suresh ke yahan 3 din kaam kiya')]);
    expect(r1.state).toMatchObject({ phase: 'CLARIFY', asking: 'amount' });
    expect(r1.speak).toMatch(/per day/i);
  });

  it('days end on the spoken date', () => {
    const [r1] = run([heard('kal tak Ramesh ke yahan 2 din kaam kiya')]);
    expect(r1.saves?.map((s) => s.date)).toEqual(['2026-11-25', '2026-11-26']);
  });
});

describe('voice commands', () => {
  const entries: Entry[] = [
    entry({ id: 'a', amount: 700, date: '2026-11-25', createdAt: 1 }),
    entry({ id: 'b', amount: 700, date: '2026-11-26', createdAt: 2 }),
    entry({ id: 'c', type: 'advance', amount: 300, date: '2026-11-26', createdAt: 3 }),
  ];

  it('"show statement" navigates without needing a yes', () => {
    const [r] = run([heard('Ramesh ka hisab dikhao')]);
    expect(r.navigate).toEqual({ employerId: 'r1' });
    expect(r.state.phase).toBe('IDLE');
  });

  it('a command for an unknown employer says so', () => {
    const [r] = run([heard('Mahesh ka hisab dikhao')]);
    expect(r.navigate).toBeUndefined();
    expect(r.speak).toContain('Mahesh');
  });

  it('a command with no name asks for one', () => {
    const [r] = run([heard('hisab dikhao')]);
    expect(r.navigate).toBeUndefined();
    expect(r.speak).toMatch(/name/i);
  });

  it('remind: opens WhatsApp directly without asking yes/no', () => {
    const ctx = makeCtx({ entries, workerName: 'Manju' });
    const [r1] = run([heard('Ramesh ko yaad dilao')], ctx);
    expect(r1.state.phase).toBe('IDLE');
    expect(r1.openWhatsApp).toContain('₹1,100');
    expect(r1.openWhatsApp).toContain('Manju');
    expect(r1.save).toBeUndefined();
  });

  it('remind when nothing is owed does not offer a message', () => {
    const [r] = run([heard('Suresh ko yaad dilao')]);
    expect(r.openWhatsApp).toBeUndefined();
    expect(r.state.phase).toBe('IDLE');
  });

  it('undo: deletes the newest entry directly without asking yes/no', () => {
    const ctx = makeCtx({ entries });
    const [r1] = run([heard('aakhri entry hatao')], ctx);
    expect(r1.state.phase).toBe('IDLE');
    expect(r1.deleteEntryId).toBe('c');
  });

  it('undo with no entries deletes nothing', () => {
    const [r] = run([heard('aakhri entry hatao')]);
    expect(r.deleteEntryId).toBeUndefined();
    expect(r.state.phase).toBe('IDLE');
  });

  it('set rate: updates directly without asking yes/no', () => {
    const [r1] = run([heard('Ramesh ka rate 750 hai')]);
    expect(r1.speak).toContain('750');
    expect(r1.state.phase).toBe('IDLE');
    expect(r1.updateEmployer).toEqual({ id: 'r1', dailyRate: 750 });
  });

  it('no command path ever produces a save', () => {
    const all = [
      ...run([heard('Ramesh ka hisab dikhao')], makeCtx({ entries })),
      ...run([heard('Ramesh ko yaad dilao')], makeCtx({ entries })),
      ...run([heard('aakhri entry hatao')], makeCtx({ entries })),
      ...run([heard('Ramesh ka rate 750 hai')]),
    ];
    expect(all.every((r) => r.save === undefined && r.saves === undefined)).toBe(true);
  });
});

describe('languages', () => {
  // Names are matched within one script: "ರಮೇಶ್" does not match "Ramesh" (no transliteration yet).
  const kn: Partial<DialogueCtx> = { lang: 'kn-IN', employers: [{ id: 'r1', name: 'ರಮೇಶ್', dailyRate: 700 }] };
  it('Kannada multi-day confirmation speech is in Kannada', () => {
    const [r] = run([heard('ರಮೇಶ್ ಅವರ ಬಳಿ ಮೂರು ದಿನ ಕೆಲಸ ಮಾಡಿದೆ')], makeCtx(kn));
    expect(r.saves).toHaveLength(3);
    expect(r.saves?.every((s) => s.amount === 700)).toBe(true);
    expect(r.speak).toMatch(/[ಀ-೿]/);
  });
  it('Hindi reminder message is in Hindi', () => {
    const employers: Employer[] = [{ id: 'r1', name: 'रमेश', dailyRate: 700 }];
    const [r] = run([heard('रमेश को याद दिलाओ')], makeCtx({ lang: 'hi-IN', employers, entries: [entry({})] }));
    expect(r.openWhatsApp).toMatch(/[ऀ-ॿ]/);
  });
});

import { describe, it, expect } from 'vitest';
import { SAMPLES } from '../src/ui/samples';
import { initialState, step, type DialogueCtx, type DialogueState } from '../src/voice/dialogue';
import type { Entry, Lang } from '../src/domain/types';

describe.each<Lang>(['en-IN', 'hi-IN', 'kn-IN'])('demo sample script (%s)', (lang) => {
  it('saves a 700 rupee work entry for Ramesh, then answers the balance question', () => {
    const entries: Entry[] = [];
    const ctx = (): DialogueCtx => ({
      today: '2026-11-27',
      lang,
      employers: [{ id: 'r1', name: 'Ramesh' }],
      entries,
      newId: () => 'id',
      now: () => 1,
    });
    let state: DialogueState = initialState;
    const spoken: string[] = [];
    let saved: Entry | undefined;
    for (const line of SAMPLES[lang]) {
      const r = step(state, { type: 'heard', text: line, confidence: 1 }, ctx());
      state = r.state;
      if (r.speak) spoken.push(r.speak);
      if (r.save) {
        saved = r.save;
        entries.push(r.save);
      }
    }
    expect(saved).toMatchObject({ employerId: 'r1', type: 'work', amount: 700 });
    expect(spoken[spoken.length - 1]).toContain('700');
    expect(state.phase).toBe('IDLE');
  });
});

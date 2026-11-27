import { describe, it, expect, afterEach, vi } from 'vitest';
import { isSpeechSupported, listen } from '../src/voice/speechInput';
import { speak } from '../src/voice/speechOutput';

const w = window as unknown as Record<string, unknown>;

type Script = (rec: MockRecognition) => void;

class MockRecognition {
  static script: Script = () => {};
  static last: MockRecognition | undefined;
  lang = '';
  interimResults = true;
  maxAlternatives = 0;
  continuous = true;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  constructor() {
    MockRecognition.last = this;
  }
  start() {
    setTimeout(() => MockRecognition.script(this), 0);
  }
  stop() {}
  abort() {}
}

afterEach(() => {
  delete w.SpeechRecognition;
  delete w.webkitSpeechRecognition;
  delete w.speechSynthesis;
  delete w.SpeechSynthesisUtterance;
  MockRecognition.script = () => {};
  MockRecognition.last = undefined;
});

describe('speech input', () => {
  it('reports unsupported and rejects listen', async () => {
    expect(isSpeechSupported()).toBe(false);
    await expect(listen('en-IN')).rejects.toBe('unsupported');
  });

  it('resolves with transcript and confidence, using the requested language', async () => {
    w.webkitSpeechRecognition = MockRecognition;
    MockRecognition.script = (r) => {
      r.onresult?.({ results: [[{ transcript: 'Ramesh ne 500 rupaye diye', confidence: 0.91 }]] });
      r.onend?.();
    };
    expect(isSpeechSupported()).toBe(true);
    const out = await listen('hi-IN');
    expect(out).toEqual({ text: 'Ramesh ne 500 rupaye diye', confidence: 0.91 });
    expect(MockRecognition.last?.lang).toBe('hi-IN');
    expect(MockRecognition.last?.interimResults).toBe(false);
  });

  it('also supports the unprefixed SpeechRecognition', async () => {
    w.SpeechRecognition = MockRecognition;
    MockRecognition.script = (r) => r.onresult?.({ results: [[{ transcript: 'hi', confidence: 0.9 }]] });
    expect((await listen('en-IN')).text).toBe('hi');
  });

  it('rejects "denied" when the mic permission is refused', async () => {
    w.webkitSpeechRecognition = MockRecognition;
    MockRecognition.script = (r) => r.onerror?.({ error: 'not-allowed' });
    await expect(listen('en-IN')).rejects.toBe('denied');
  });

  it('rejects "no_speech" on silence', async () => {
    w.webkitSpeechRecognition = MockRecognition;
    MockRecognition.script = (r) => r.onerror?.({ error: 'no-speech' });
    await expect(listen('en-IN')).rejects.toBe('no_speech');
  });

  it('rejects "no_speech" when recognition ends with no result', async () => {
    w.webkitSpeechRecognition = MockRecognition;
    MockRecognition.script = (r) => r.onend?.();
    await expect(listen('en-IN')).rejects.toBe('no_speech');
  });

  it('treats a reported confidence of 0 as unknown, not as certainly wrong', async () => {
    w.webkitSpeechRecognition = MockRecognition;
    MockRecognition.script = (r) => r.onresult?.({ results: [[{ transcript: 'hello', confidence: 0 }]] });
    expect((await listen('en-IN')).confidence).toBeGreaterThanOrEqual(0.6);
  });
});

class MockUtterance {
  voice: { lang: string } | null = null;
  lang = '';
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}

function mockSynth(langs: string[]) {
  const spoken: MockUtterance[] = [];
  w.SpeechSynthesisUtterance = MockUtterance;
  w.speechSynthesis = {
    getVoices: () => langs.map((lang) => ({ lang, name: lang })),
    cancel: vi.fn(),
    speak: (u: MockUtterance) => {
      spoken.push(u);
      setTimeout(() => u.onend?.(), 0);
    },
  };
  return spoken;
}

describe('speech output', () => {
  it('uses a voice matching the language', async () => {
    const spoken = mockSynth(['en-IN', 'hi-IN']);
    await speak('namaste', 'hi-IN');
    expect(spoken[0].voice?.lang).toBe('hi-IN');
    expect(spoken[0].lang).toBe('hi-IN');
  });

  it('falls back to an en-IN voice when the language has none', async () => {
    const spoken = mockSynth(['en-IN', 'en-US']);
    await speak('hello', 'kn-IN');
    expect(spoken[0].voice?.lang).toBe('en-IN');
  });

  it('still speaks (letting the browser choose) when no voice matches at all', async () => {
    const spoken = mockSynth(['fr-FR']);
    await speak('hello', 'kn-IN');
    expect(spoken).toHaveLength(1);
    expect(spoken[0].voice).toBeNull();
  });

  it('resolves immediately when speech synthesis is unavailable', async () => {
    await expect(speak('hello', 'en-IN')).resolves.toBeUndefined();
  });

  it('gives up waiting if the engine never finishes, so the dialogue cannot hang', async () => {
    vi.useFakeTimers();
    try {
      mockSynth(['en-IN']);
      (w.speechSynthesis as { speak: (u: MockUtterance) => void }).speak = () => {}; // never ends
      const done = vi.fn();
      void speak('hello', 'en-IN').then(done);
      await vi.advanceTimersByTimeAsync(1000);
      expect(done).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(10000);
      expect(done).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('resolves even if the engine errors', async () => {
    mockSynth(['en-IN']);
    (w.speechSynthesis as { speak: (u: MockUtterance) => void }).speak = (u) => setTimeout(() => u.onerror?.(), 0);
    await expect(speak('hello', 'en-IN')).resolves.toBeUndefined();
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

// Fake microphone + Wispr Flow (jsdom has neither). Each recording's blob says which take it was.
const h = vi.hoisted(() => ({
  canRecord: true,
  wispr: true,
  transcripts: [] as (string | null)[],
  takes: 0,
  session: null as null | { stop(): void; cancel(): void },
  cancelled: false,
  transcribeCalls: 0,
}));
vi.mock('../src/voice/recorder', () => ({
  canRecord: () => h.canRecord,
  startRecorder: async () => {
    let resolve!: (r: unknown) => void;
    const result = new Promise((r) => (resolve = r));
    const take = ++h.takes;
    h.cancelled = false;
    const session = {
      level: () => 0.3,
      // durationMs identifies the take (the fake database does not round-trip Blob methods)
      stop: () => resolve({ blob: new Blob([`take-${take}`], { type: 'audio/webm' }), mime: 'audio/webm', durationMs: take * 1000 }),
      cancel: () => {
        h.cancelled = true;
        resolve(null);
      },
      cancelledByUser: () => h.cancelled,
      result,
    };
    h.session = session;
    return session;
  },
}));
vi.mock('../src/voice/engine', () => ({
  wisprConfigured: async () => h.wispr,
  transcribeRecording: async () => {
    h.transcribeCalls++;
    return h.transcripts.length ? h.transcripts.shift()! : null;
  },
}));

import App from '../src/App';
import { db, listEntries, getClip } from '../src/db/db';

const w = window as unknown as Record<string, unknown>;
class MockRecognition {
  static queue: string[] = [];
  static starts = 0;
  lang = '';
  interimResults = false;
  maxAlternatives = 1;
  continuous = false;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  start() {
    MockRecognition.starts++;
    setTimeout(() => {
      const text = MockRecognition.queue.shift();
      if (text !== undefined) this.onresult?.({ results: [[{ transcript: text, confidence: 0.9 }]] });
    }, 0);
  }
  stop() {}
  abort() {
    this.onerror?.({ error: 'aborted' });
  }
}

beforeEach(async () => {
  await db.entries.clear();
  await db.employers.clear();
  await db.settings.clear();
  await db.clips.clear();
  Object.assign(h, { canRecord: true, wispr: true, transcripts: [], takes: 0, session: null, cancelled: false, transcribeCalls: 0 });
  MockRecognition.queue = [];
  MockRecognition.starts = 0;
  w.webkitSpeechRecognition = MockRecognition;
});
afterEach(() => {
  delete w.webkitSpeechRecognition;
  vi.restoreAllMocks();
});

const tapMic = async () => fireEvent.click(await screen.findByRole('button', { name: /tap to speak/i }));
/** Simulates the worker finishing speaking (auto-stop after silence). */
const finishSpeaking = async () => {
  await waitFor(() => expect(h.session).not.toBeNull());
  const s = h.session!;
  h.session = null;
  s.stop();
};

describe('Wispr Flow as the speech engine', () => {
  it('records, shows the Wispr Flow listening screen, transcribes, and attaches the voice proof', async () => {
    await db.employers.put({ id: 'r1', name: 'Ramesh' });
    h.transcripts = ['Ramesh ne 500 rupaye diye'];
    render(<App />);
    await tapMic();
    const listening = await screen.findByTestId('listening');
    expect(listening).toHaveTextContent(/wispr flow/i);
    await finishSpeaking();
    await waitFor(async () => expect(await listEntries()).toHaveLength(1));
    expect(await screen.findByTestId('saved-bar')).toHaveTextContent('Ramesh ₹500');
    const [saved] = await listEntries();
    expect(saved.clipId).toBeDefined();
    expect((await getClip(saved.clipId!))!.durationMs).toBe(1000); // take 1
  });

  it('a multi-day sentence shares one clip across all its days', async () => {
    await db.employers.put({ id: 'r1', name: 'Ramesh', dailyRate: 700 });
    h.transcripts = ['Ramesh ke yahan 3 din kaam kiya'];
    render(<App />);
    await tapMic();
    await finishSpeaking();
    await waitFor(async () => expect(await listEntries()).toHaveLength(3));
    const ids = new Set((await listEntries()).map((e) => e.clipId));
    expect(ids.size).toBe(1);
    expect(await db.clips.count()).toBe(1);
  });

  it('keeps the clip of the first sentence, not of the answer to a follow-up question', async () => {
    await db.employers.put({ id: 's1', name: 'Suresh' });
    h.transcripts = ['Aaj Suresh ke yahan kaam kiya', '650'];
    render(<App />);
    await tapMic();
    await finishSpeaking(); // take 1: the sentence
    await finishSpeaking(); // take 2: "650" (hands-free answer)
    await waitFor(async () => expect(await listEntries()).toHaveLength(1));
    const [saved] = await listEntries();
    expect(saved.amount).toBe(650);
    expect((await getClip(saved.clipId!))!.durationMs).toBe(1000); // take 1
  });

  it('falls back to phone speech when Wispr Flow fails', async () => {
    h.transcripts = [null];
    MockRecognition.queue = ['Ramesh ne 300 rupaye diye'];
    render(<App />);
    await tapMic();
    await finishSpeaking();
    expect(await screen.findByTestId('saved-bar')).toHaveTextContent('₹300');
    expect(h.transcribeCalls).toBe(1); // tried Wispr once, then phone speech
    expect(MockRecognition.starts).toBeGreaterThanOrEqual(1);
  });

  it('uses phone speech straight away when the server has no Wispr Flow key', async () => {
    h.wispr = false;
    MockRecognition.queue = ['Ramesh ne 300 rupaye diye'];
    render(<App />);
    await tapMic();
    expect(await screen.findByTestId('saved-bar')).toHaveTextContent('₹300');
    expect(MockRecognition.starts).toBeGreaterThanOrEqual(1);
    expect(h.transcribeCalls).toBe(0);
  });

  it('Cancel on the listening screen throws the recording away', async () => {
    h.transcripts = ['Ramesh ne 500 rupaye diye'];
    render(<App />);
    await tapMic();
    const overlay = await screen.findByTestId('listening');
    fireEvent.click(within(overlay).getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByTestId('listening')).toBeNull());
    expect(screen.queryByTestId('confirm-card')).toBeNull();
    expect(screen.queryByTestId('heard')).toBeNull();
  });

  it('with voice proof turned off, no clip is kept', async () => {
    await db.settings.put({ key: 'keepProof', value: false });
    h.transcripts = ['Ramesh ne 500 rupaye diye'];
    render(<App />);
    await tapMic();
    await finishSpeaking();
    await waitFor(async () => expect(await listEntries()).toHaveLength(1));
    expect((await listEntries())[0].clipId).toBeUndefined();
    expect(await db.clips.count()).toBe(0);
  });

  it('turning Wispr Flow off in Settings uses phone speech', async () => {
    await db.settings.put({ key: 'useWispr', value: false });
    MockRecognition.queue = ['Ramesh ne 300 rupaye diye'];
    render(<App />);
    await tapMic();
    expect(await screen.findByTestId('saved-bar')).toHaveTextContent('₹300');
    expect(h.transcribeCalls).toBe(0); // Wispr Flow never used
  });
});

describe('voice proof in the ledger', () => {
  it('shows a badge and plays the clip', async () => {
    await db.employers.put({ id: 'r1', name: 'Ramesh' });
    const clipId = 'c1';
    await db.clips.put({ id: clipId, blob: new Blob(['x'], { type: 'audio/webm' }), mime: 'audio/webm', durationMs: 4000, createdAt: 1 });
    await db.entries.put({ id: 'e1', employerId: 'r1', type: 'work', amount: 700, date: '2026-11-27', source: 'worker', rawTranscript: '', lang: 'en-IN', createdAt: 1, clipId });
    const play = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('Audio', vi.fn(function () {
      return { play, pause: vi.fn() };
    }));
    const createObjectURL = vi.fn(() => 'blob:x');
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^ledger$/i }));
    const [row] = await screen.findAllByTestId('ledger-row');
    expect(within(row).getByText(/voice proof/i)).toBeInTheDocument();
    const btn = within(row).getByRole('button', { name: /play voice proof/i });
    await waitFor(() => expect(btn).toHaveTextContent('0:04')); // duration loads from the database
    fireEvent.click(btn);
    await waitFor(() => expect(play).toHaveBeenCalled());
    expect(createObjectURL).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe('Settings: voice engine and proof', () => {
  it('shows whether Wispr Flow is connected', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^settings$/i }));
    expect(await screen.findByText(/wispr flow is connected/i)).toBeInTheDocument();
  });
  it('says when Wispr Flow is not set up', async () => {
    h.wispr = false;
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^settings$/i }));
    expect(await screen.findByText(/not set up/i)).toBeInTheDocument();
  });
  it('remembers the voice-proof and Wispr switches', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^settings$/i }));
    fireEvent.click(await screen.findByRole('switch', { name: /keep voice proof/i }));
    fireEvent.click(screen.getByRole('switch', { name: /use wispr flow/i }));
    await waitFor(async () => {
      expect((await db.settings.get('keepProof'))?.value).toBe(false);
      expect((await db.settings.get('useWispr'))?.value).toBe(false);
    });
  });
});

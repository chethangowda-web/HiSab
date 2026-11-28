import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { messages } from '../src/i18n/messages';

// Fake microphone, speech engine and speaker: the engine says which language it detected.
const h = vi.hoisted(() => ({
  transcripts: [] as ({ text: string; lang?: string; langProbability?: number } | null)[],
  spoken: [] as { text: string; lang: string }[],
  wispr: true,
}));
vi.mock('../src/voice/recorder', () => ({
  canRecord: () => true,
  startRecorder: async () => {
    const result = Promise.resolve({ blob: new Blob(['x'], { type: 'audio/webm' }), mime: 'audio/webm', durationMs: 1000 });
    return { level: () => 0.3, stop: () => {}, cancel: () => {}, cancelledByUser: () => false, result };
  },
}));
vi.mock('../src/voice/engine', () => ({
  wisprConfigured: async () => h.wispr,
  transcribeRecording: async () => (h.transcripts.length ? h.transcripts.shift()! : null),
}));
vi.mock('../src/voice/speechOutput', () => ({
  speak: async (text: string, lang: string) => {
    h.spoken.push({ text, lang });
  },
}));

import App from '../src/App';
import { db } from '../src/db/db';

beforeEach(async () => {
  await db.entries.clear();
  await db.employers.clear();
  await db.settings.clear();
  await db.clips.clear();
  Object.assign(h, { transcripts: [], spoken: [], wispr: true });
});

afterEach(() => vi.unstubAllGlobals());

const tapMic = async () => fireEvent.click(await screen.findByRole('button', { name: /tap to speak|बोलने के लिए|ಮಾತನಾಡಲು/i }));
const HINDI = { text: 'आज रमेश के यहाँ सात सौ रुपये काम किया', lang: 'hi-IN', langProbability: 0.95 };

describe('replying in the language that was spoken', () => {
  it('switches to Hindi when Hindi is detected, and reads the reply back in Hindi', async () => {
    await db.employers.put({ id: 'r1', name: 'रमेश' });
    h.transcripts = [HINDI];
    render(<App />);
    await tapMic();
    await waitFor(() => expect(h.spoken.length).toBeGreaterThan(0));
    expect(h.spoken[0].lang).toBe('hi-IN');
    expect(h.spoken[0].text).toBe(messages('hi-IN').saved);
    await waitFor(async () => expect((await db.settings.get('language'))?.value).toBe('hi-IN'));
    expect(await screen.findByRole('button', { name: 'Language: हिन्दी' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches to Kannada when Kannada is detected', async () => {
    h.transcripts = [{ text: 'ಇಂದು ರಮೇಶ್ ಹತ್ತಿರ ಕೆಲಸ ಮಾಡಿದೆ', lang: 'kn-IN', langProbability: 0.9 }];
    render(<App />);
    await tapMic();
    await waitFor(() => expect(h.spoken.length).toBeGreaterThan(0));
    expect(h.spoken.every((s) => s.lang === 'kn-IN')).toBe(true);
    await waitFor(async () => expect((await db.settings.get('language'))?.value).toBe('kn-IN'));
  });

  it('does not switch for a short answer like "haan"', async () => {
    h.transcripts = [{ text: 'haan', lang: 'hi-IN', langProbability: 0.99 }];
    render(<App />);
    await tapMic();
    await waitFor(() => expect(h.spoken.length).toBeGreaterThan(0));
    expect(h.spoken.every((s) => s.lang === 'en-IN')).toBe(true);
    expect((await db.settings.get('language'))?.value).toBeUndefined();
  });

  it('does not switch on low-confidence detection or an unsupported language', async () => {
    h.transcripts = [{ text: 'Ramesh ke yahan kaam kiya aaj', lang: 'hi-IN', langProbability: 0.4 }];
    render(<App />);
    await tapMic();
    await waitFor(() => expect(h.spoken.length).toBeGreaterThan(0));
    expect(h.spoken.every((s) => s.lang === 'en-IN')).toBe(true);
    expect((await db.settings.get('language'))?.value).toBeUndefined();
  });

  it('when nothing could be transcribed, asks again in the selected language instead of failing silently', async () => {
    await db.settings.put({ key: 'language', value: 'hi-IN' });
    h.wispr = false; // Sarvam is the server engine
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ sarvamStt: true }), { status: 200 })));
    h.transcripts = [null];
    render(<App />);
    await tapMic();
    await waitFor(() => expect(h.spoken.length).toBeGreaterThan(0));
    expect(h.spoken[0]).toEqual({ text: messages('hi-IN').repeat, lang: 'hi-IN' });
  });
});

import type { Lang } from '../domain/types';
import type { Recording } from './recorder';
import { arrayBufferToBase64, toWav16kMono } from './wav';

export type VoiceEngineKind = 'wispr' | 'sarvam' | 'browser';

/** Detects which server-side STT engine is available (Wispr Flow first, then Sarvam Saaras v4). */
export async function voiceEngineKind(fetchImpl: typeof fetch = fetch): Promise<VoiceEngineKind> {
  try {
    const res = await fetchImpl('/api/voice-health');
    if (!res.ok) return 'browser';
    const data = (await res.json()) as { wispr?: unknown; sarvamStt?: unknown };
    if (data?.wispr === true) return 'wispr';
    if (data?.sarvamStt === true) return 'sarvam';
    return 'browser';
  } catch {
    return 'browser';
  }
}

/** True if our server has a Wispr Flow key (it never sends the key itself). */
export async function wisprConfigured(fetchImpl: typeof fetch = fetch): Promise<boolean> {
  return (await voiceEngineKind(fetchImpl)) === 'wispr';
}

/** Decodes a browser recording and re-encodes it as the 16 kHz mono WAV that Wispr Flow expects. */
export async function recordingToWavBase64(blob: Blob): Promise<string> {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const audio = await ctx.decodeAudioData(await blob.arrayBuffer());
    return arrayBufferToBase64(toWav16kMono(audio.getChannelData(0), audio.sampleRate));
  } finally {
    void ctx.close().catch(() => {});
  }
}

/** What the server heard. `lang` is set only when the speech engine detected one of the app's languages. */
export interface Transcription {
  text: string;
  lang?: Lang;
  langProbability?: number;
}

const APP_LANGS: readonly Lang[] = ['en-IN', 'hi-IN', 'kn-IN'];
/** Maps an engine's language code to an app language; other languages (ta-IN...) are left undetected. */
export function appLangOf(code: unknown): Lang | undefined {
  return typeof code === 'string' ? APP_LANGS.find((l) => l === code) : undefined;
}

/**
 * Sends a recording to our server (Wispr Flow or Sarvam), with the employer names as a dictionary.
 * Returns the text and, when detected, the spoken language; or null on any failure
 * (the caller then asks again or falls back to browser speech).
 */
export async function transcribeRecording(
  rec: Recording,
  lang: Lang,
  names: string[],
  fetchImpl: typeof fetch = fetch,
  toWav: (blob: Blob) => Promise<string> = recordingToWavBase64,
): Promise<Transcription | null> {
  try {
    const audio = await toWav(rec.blob);
    const res = await fetchImpl('/api/transcribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ audio, lang, names: names.slice(0, 100) }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: unknown; lang?: unknown; langProbability?: unknown };
    if (typeof data?.text !== 'string' || !data.text.trim()) return null;
    const out: Transcription = { text: data.text.trim() };
    const detected = appLangOf(data.lang);
    if (detected) out.lang = detected;
    if (typeof data.langProbability === 'number' && Number.isFinite(data.langProbability)) out.langProbability = data.langProbability;
    return out;
  } catch {
    return null;
  }
}

/** Wispr Flow REST transcription (https://api-docs.wisprflow.ai). The key never leaves this server. */
export const WISPR_URL = 'https://platform-api.wisprflow.ai/api/v1/dash/api';

export interface TranscribeRequest {
  /** Base64 of a 16 kHz mono 16-bit WAV. */
  audio: string;
  /** App language: en-IN, hi-IN or kn-IN. */
  lang: string;
  /** Employer names, sent as a dictionary so Wispr spells them right. */
  names: string[];
}

const LANG_CODE: Record<string, string> = { 'en-IN': 'en', 'hi-IN': 'hi', 'kn-IN': 'kn' };
const MAX_AUDIO_CHARS = 4_000_000; // ~ 2 minutes of 16 kHz audio as base64

export function validateTranscribe(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return 'body must be an object';
  const b = body as Record<string, unknown>;
  if (typeof b.audio !== 'string' || !b.audio || b.audio.length > MAX_AUDIO_CHARS || !/^[A-Za-z0-9+/]+={0,2}$/.test(b.audio)) {
    return 'audio must be base64';
  }
  if (typeof b.lang !== 'string' || !(b.lang in LANG_CODE)) return 'unsupported language';
  if (!Array.isArray(b.names) || b.names.length > 100 || b.names.some((n) => typeof n !== 'string' || n.length > 60)) {
    return 'names must be a short list of strings';
  }
  return null;
}

/** The response format is not documented; accept the likely shapes and nothing else. */
function textOf(data: unknown): string | null {
  const d = data as { text?: unknown; body?: { text?: unknown }; transcript?: unknown } | null;
  const t = d?.text ?? d?.body?.text ?? d?.transcript;
  return typeof t === 'string' ? t.trim() : null;
}

/** Returns the transcript, or throws (never including the key in the error). */
export async function transcribeWithWispr(key: string, req: TranscribeRequest, fetchImpl: typeof fetch = fetch, timeoutMs = 20000): Promise<string> {
  const res = await fetchImpl(WISPR_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      audio: req.audio,
      language: [LANG_CODE[req.lang]],
      context: { app: { name: 'BoliHisab', type: 'other' }, dictionary_context: req.names },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`wispr status ${res.status}`);
  const text = textOf(await res.json());
  if (text === null) throw new Error('wispr returned no text');
  return text;
}

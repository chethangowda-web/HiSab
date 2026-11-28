import { buildMessages, buildMultiMessages, type ChatMessage, type ParseRequest } from './prompt';
import type { TranscribeRequest } from './wispr';

export const SARVAM_URL = 'https://api.sarvam.ai/v1/chat/completions';
export const SARVAM_STT_URL = 'https://api.sarvam.ai/speech-to-text';
export const DEFAULT_SARVAM_MODEL = 'sarvam-105b';
export const DEFAULT_SARVAM_STT_MODEL = 'saaras:v4';

export interface SarvamConfig {
  apiKey: string;
  model?: string;
  url?: string;
}

/** Extracts a JSON object from raw model text, tolerating optional ```json fences. */
function parseJsonContent(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse(fenced ? fenced[1] : trimmed);
}

async function callSarvamChat(
  cfg: SarvamConfig,
  messages: ChatMessage[],
  maxTokens: number,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<unknown> {
  const res = await fetchImpl(cfg.url ?? SARVAM_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'api-subscription-key': cfg.apiKey,
    },
    body: JSON.stringify({
      model: cfg.model ?? DEFAULT_SARVAM_MODEL,
      messages,
      temperature: 0,
      max_tokens: maxTokens,
      reasoning_effort: 'low',
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`sarvam status ${res.status}`);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: unknown } }> };
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('sarvam returned no content');
  return parseJsonContent(content);
}

/** Asks Sarvam 105B to parse one utterance into the structured JSON schema. */
export async function askSarvam(
  cfg: SarvamConfig,
  req: ParseRequest,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 20000,
): Promise<unknown> {
  return callSarvamChat(cfg, buildMessages(req), 2500, fetchImpl, timeoutMs);
}

/** Asks Sarvam 105B to split a multi-amount utterance into multiple structured entries. */
export async function askSarvamMulti(
  cfg: SarvamConfig,
  req: ParseRequest,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 20000,
): Promise<unknown> {
  return callSarvamChat(cfg, buildMultiMessages(req), 2500, fetchImpl, timeoutMs);
}

/** Transcribes a 16 kHz mono WAV recording using Sarvam Saaras v4 in codemix mode. */
export async function transcribeWithSarvam(
  apiKey: string,
  req: TranscribeRequest,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 25000,
): Promise<string> {
  const bytes = Buffer.from(req.audio, 'base64');
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: 'audio/wav' }), 'audio.wav');
  form.append('model', DEFAULT_SARVAM_STT_MODEL);
  form.append('language_code', req.lang);
  form.append('mode', 'codemix');

  const res = await fetchImpl(SARVAM_STT_URL, {
    method: 'POST',
    headers: { 'api-subscription-key': apiKey },
    body: form,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`sarvam stt status ${res.status}`);
  const data = (await res.json()) as { transcript?: unknown };
  const text = typeof data?.transcript === 'string' ? data.transcript.trim() : '';
  if (!text) throw new Error('sarvam stt returned no transcript');
  return text;
}

export const SARVAM_TTS_URL = 'https://api.sarvam.ai/text-to-speech';
export const DEFAULT_SARVAM_TTS_MODEL = 'bulbul:v3';

/** Speaks text with Sarvam Bulbul in the given language; returns base64 WAV audio. */
export async function ttsWithSarvam(
  apiKey: string,
  text: string,
  lang: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 20000,
): Promise<string> {
  const res = await fetchImpl(SARVAM_TTS_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'api-subscription-key': apiKey },
    body: JSON.stringify({
      text,
      target_language_code: lang,
      model: DEFAULT_SARVAM_TTS_MODEL,
      speaker: 'shubh',
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`sarvam tts status ${res.status}`);
  const data = (await res.json()) as { audios?: unknown };
  const audio = Array.isArray(data?.audios) ? data.audios[0] : undefined;
  if (typeof audio !== 'string' || !audio) throw new Error('sarvam tts returned no audio');
  return audio;
}

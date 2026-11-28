import type { Lang } from '../domain/types';

let sarvamTts: boolean | undefined;
let current: HTMLAudioElement | null = null;

async function ttsAvailable(): Promise<boolean> {
  if (sarvamTts !== undefined) return sarvamTts;
  try {
    const res = await fetch('/api/voice-health');
    const data = res.ok ? ((await res.json()) as { sarvamTts?: unknown }) : null;
    sarvamTts = data?.sarvamTts === true;
  } catch {
    sarvamTts = false;
  }
  return sarvamTts;
}

/** Plays Sarvam Bulbul audio for the text. Resolves true if it played, false to fall back to the browser voice. */
async function speakWithSarvam(text: string, lang: Lang): Promise<boolean> {
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, lang }),
    });
    if (!res.ok) return false;
    const { audio } = (await res.json()) as { audio?: unknown };
    if (typeof audio !== 'string' || !audio) return false;
    return await new Promise<boolean>((resolve) => {
      const el = new Audio(`data:audio/wav;base64,${audio}`);
      current?.pause();
      current = el;
      const timer = setTimeout(() => resolve(true), 3000 + text.length * 200);
      el.onended = () => {
        clearTimeout(timer);
        resolve(true);
      };
      el.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };
      el.play().catch(() => {
        clearTimeout(timer);
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}

/**
 * Speaks text aloud in the selected language: Sarvam Bulbul when the server has it,
 * otherwise a browser voice for that language. Always resolves so the app never hangs.
 */
export async function speak(text: string, lang: Lang): Promise<void> {
  if (typeof window !== 'undefined' && typeof Audio !== 'undefined' && (await ttsAvailable())) {
    if (await speakWithSarvam(text, lang)) return;
  }
  return speakWithBrowser(text, lang);
}

function speakWithBrowser(text: string, lang: Lang): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    return Promise.resolve();
  }
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  const prefix = lang.split('-')[0].toLowerCase();
  const voice = voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ?? null;

  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice?.lang ?? lang;
    if (voice) u.voice = voice;
    // Some browsers never fire onend; stop waiting after a generous estimate.
    const timer = setTimeout(() => {
      synth.cancel();
      resolve();
    }, 3000 + text.length * 120);
    const finish = () => {
      clearTimeout(timer);
      resolve();
    };
    u.onend = finish;
    u.onerror = finish;
    synth.cancel();
    synth.speak(u);
  });
}

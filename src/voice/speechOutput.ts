import type { Lang } from '../domain/types';

/**
 * Speaks text aloud. Prefers a voice for the language, then en-IN, then lets the browser choose.
 * Always resolves (even on engine errors or when speech is unavailable) so the app never hangs.
 */
export function speak(text: string, lang: Lang): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    return Promise.resolve();
  }
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  const prefix = lang.split('-')[0].toLowerCase();
  const voice =
    voices.find((v) => v.lang === lang) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ??
    voices.find((v) => v.lang === 'en-IN') ??
    null;

  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice?.lang ?? lang;
    if (voice) u.voice = voice;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.cancel();
    synth.speak(u);
  });
}

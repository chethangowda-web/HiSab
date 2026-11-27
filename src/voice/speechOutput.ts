import type { Lang } from '../domain/types';

/**
 * Speaks text aloud. Prefers a voice for the language, then en-IN, then lets the browser choose.
 * Always resolves (on engine errors, when speech is unavailable, or if the engine never finishes)
 * so the app never hangs.
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
    // Some browsers (no voice for the language, or no speech service) never fire onend.
    // Stop waiting after a generous estimate so the conversation cannot hang.
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

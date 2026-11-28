import type { Lang } from '../domain/types';

/** Detection must be at least this sure before the app switches language. */
export const LANG_SWITCH_MIN_PROBABILITY = 0.7;

/**
 * Should the app switch to the language it just heard? Never for one or two words ("haan", "yes",
 * "no", a bare name), never for low-confidence detection, never when it is already that language.
 */
export function shouldSwitchLanguage(text: string, detected: Lang | undefined, probability: number | undefined, current: Lang): boolean {
  if (!detected || detected === current) return false;
  if (probability !== undefined && probability < LANG_SWITCH_MIN_PROBABILITY) return false;
  return text.trim().split(/\s+/).filter(Boolean).length > 2;
}

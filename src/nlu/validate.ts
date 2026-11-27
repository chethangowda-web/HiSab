import type { Entry } from '../domain/types';
import { allNumbers } from './normalize';

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: 'no_amount' | 'amount_not_in_transcript' | 'bad_amount' | 'future_date' | 'bad_hours' };

/**
 * Hard rules a draft must pass before it may be shown for confirmation.
 * The amount must also appear in what the user actually said, so a model can never invent one.
 */
export function validateDraft(draft: Partial<Entry>, transcript: string, today: string): ValidationResult {
  if (draft.amount === undefined) return { ok: false, reason: 'no_amount' };
  if (!Number.isInteger(draft.amount) || draft.amount <= 0 || draft.amount >= 100000) {
    return { ok: false, reason: 'bad_amount' };
  }
  if (!allNumbers(transcript).includes(draft.amount)) return { ok: false, reason: 'amount_not_in_transcript' };
  if (draft.date !== undefined && draft.date > today) return { ok: false, reason: 'future_date' };
  if (draft.hours !== undefined && !(draft.hours > 0 && draft.hours <= 24)) return { ok: false, reason: 'bad_hours' };
  return { ok: true };
}

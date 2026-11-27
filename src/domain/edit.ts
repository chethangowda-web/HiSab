export type EditCheck = { ok: true } | { ok: false; reason: 'bad_amount' | 'bad_date' | 'future_date' };

const isRealDate = (iso: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso; // rejects 2026-02-31
};

/** Rules for manually editing an entry; same bounds as spoken entries. */
export function validateEdit(input: { amount: number; date: string }, today: string): EditCheck {
  const { amount, date } = input;
  if (!Number.isInteger(amount) || amount <= 0 || amount >= 100000) return { ok: false, reason: 'bad_amount' };
  if (!isRealDate(date)) return { ok: false, reason: 'bad_date' };
  if (date > today) return { ok: false, reason: 'future_date' };
  return { ok: true };
}

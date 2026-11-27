import type { Entry } from './types';

const forEmployer = (entries: Entry[], employerId: string) =>
  entries.filter((x) => x.employerId === employerId);

const sum = (entries: Entry[], types: Entry['type'][]) =>
  entries.filter((x) => types.includes(x.type)).reduce((t, x) => t + x.amount, 0);

export function totals(entries: Entry[], employerId: string) {
  const mine = forEmployer(entries, employerId);
  const earnedAmt = sum(mine, ['work', 'overtime']);
  const advances = sum(mine, ['advance']);
  const payments = sum(mine, ['payment']);
  return { earned: earnedAmt, advances, payments, outstanding: earnedAmt - advances - payments };
}

export function balance(entries: Entry[], employerId: string): number {
  return totals(entries, employerId).outstanding;
}

export function daysWorked(entries: Entry[], employerId: string): number {
  return new Set(
    forEmployer(entries, employerId)
      .filter((x) => x.type === 'work')
      .map((x) => x.date),
  ).size;
}

/** `month` is 'YYYY-MM'. Counts work + overtime. */
export function earned(entries: Entry[], opts: { employerId?: string; month?: string } = {}): number {
  return entries
    .filter((x) => (opts.employerId ? x.employerId === opts.employerId : true))
    .filter((x) => (opts.month ? x.date.startsWith(opts.month) : true))
    .filter((x) => x.type === 'work' || x.type === 'overtime')
    .reduce((t, x) => t + x.amount, 0);
}

export function overtimeAmount(hours: number, ratePerHour: number): number {
  return Math.round(hours * ratePerHour);
}

import type { Employer, Entry, Lang } from './types';
import { totals } from './ledger';
import { typeLabel } from '../i18n/messages';
import { inr, uiText } from '../i18n/ui';

export type StatementTotals = ReturnType<typeof totals>;

/** Chronological rows (oldest first) for one employer: [date, type, amount, who recorded it]. */
export function buildStatementRows(
  entries: Entry[],
  employer: Employer,
  lang: Lang = 'en-IN',
): { rows: string[][]; totals: StatementTotals } {
  const t = uiText(lang);
  const mine = entries
    .filter((e) => e.employerId === employer.id)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  const rows = mine.map((e) => [
    e.date,
    `${typeLabel(lang, e.type)}${e.hours !== undefined ? ` · ${e.hours}h` : ''}`,
    inr(e.amount),
    e.source === 'employer_confirmed' ? t.employerConfirmed : t.workerRecorded,
  ]);
  return { rows, totals: totals(entries, employer.id) };
}

/** A short plain-text summary that works anywhere text works (WhatsApp, SMS), in any script. */
export function buildSummaryText(entries: Entry[], employer: Employer, lang: Lang, workerName: string): string {
  const t = uiText(lang);
  const { totals: s } = buildStatementRows(entries, employer, lang);
  const lines = [
    `${t.statementTitle}: ${employer.name}`,
    ...(workerName.trim() ? [workerName.trim()] : []),
    `${t.earned}: ${inr(s.earned)}`,
    `${t.advances}: ${inr(s.advances)}`,
    `${t.payments}: ${inr(s.payments)}`,
    `${t.outstanding}: ${inr(s.outstanding)}`,
    `(${t.footerNote})`,
  ];
  return lines.join('\n');
}

/** Shares text through the native share sheet, or WhatsApp as a fallback. */
export async function shareSummary(text: string, title: string): Promise<'shared' | 'whatsapp' | 'cancelled'> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return 'cancelled';
      // any other failure: fall through to WhatsApp
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  return 'whatsapp';
}

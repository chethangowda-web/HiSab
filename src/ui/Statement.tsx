import { localISODate } from '../domain/dates';
import { buildStatementRows, buildSummaryText, shareSummary } from '../domain/statement';
import { inr } from '../i18n/ui';
import { useApp } from './AppContext';

/**
 * A printable wage statement. "Save as PDF" uses the browser's print dialog, because the browser
 * shapes Kannada and Hindi text correctly (a hand-built PDF library does not).
 */
export default function Statement({ employerId, onBack }: { employerId: string; onBack: () => void }) {
  const { t, lang, entries, employers, workerName } = useApp();
  const employer = employers.find((e) => e.id === employerId);
  if (!employer) return null;
  const { rows, totals } = buildStatementRows(entries, employer, lang);

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex flex-wrap gap-2">
        <button type="button" onClick={onBack} className="h-12 rounded-xl bg-slate-200 px-4 text-base font-semibold">
          {t.back}
        </button>
        <button type="button" onClick={() => window.print()} className="h-12 rounded-xl bg-teal-700 px-4 text-base font-semibold text-white">
          {t.savePdf}
        </button>
        <button
          type="button"
          onClick={() => void shareSummary(buildSummaryText(entries, employer, lang, workerName), t.statementTitle)}
          className="h-12 rounded-xl bg-teal-100 px-4 text-base font-semibold text-teal-900"
        >
          {t.shareSummary}
        </button>
      </div>

      <article data-testid="statement" className="print-area rounded-2xl bg-white p-5 shadow">
        <h2 className="text-2xl font-bold">{t.statementTitle}</h2>
        <p className="text-xl">{employer.name}</p>
        {workerName.trim() && <p className="text-slate-600">{workerName.trim()}</p>}
        <p className="text-sm text-slate-500">{localISODate()}</p>

        <table className="mt-4 w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-slate-300 text-sm text-slate-600">
              <th className="py-2 pr-2">{t.colDate}</th>
              <th className="py-2 pr-2">{t.colType}</th>
              <th className="py-2 pr-2 text-right">{t.colAmount}</th>
              <th className="py-2">{t.colRecordedBy}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-200">
                <td className="whitespace-nowrap py-2 pr-2">{r[0]}</td>
                <td className="py-2 pr-2">{r[1]}</td>
                <td className="py-2 pr-2 text-right">{r[2]}</td>
                <td className="py-2 text-sm">{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1">
          <dt>{t.earned}</dt>
          <dd className="text-right font-semibold">{inr(totals.earned)}</dd>
          <dt>{t.advances}</dt>
          <dd className="text-right font-semibold">{inr(totals.advances)}</dd>
          <dt>{t.payments}</dt>
          <dd className="text-right font-semibold">{inr(totals.payments)}</dd>
          <dt className="text-lg font-bold">{t.outstanding}</dt>
          <dd className="text-right text-lg font-bold">{inr(totals.outstanding)}</dd>
        </dl>

        <p className="mt-4 text-sm text-slate-600">{t.footerNote}</p>
      </article>
    </div>
  );
}

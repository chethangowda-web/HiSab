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
        <button type="button" onClick={onBack} className="h-12 rounded-full btn btn-ghost px-5">
          {t.back}
        </button>
        <button type="button" onClick={() => window.print()} className="btn btn-primary px-5">
          {t.savePdf}
        </button>
        <button
          type="button"
          onClick={() => void shareSummary(buildSummaryText(entries, employer, lang, workerName), t.statementTitle)}
          className="btn btn-ghost px-5 text-[#9A3F06]"
        >
          {t.shareSummary}
        </button>
      </div>

      <article data-testid="statement" className="print-area card p-5 text-[#1C1917]">
        <h2 className="text-2xl font-extrabold text-[#C2570C]">{t.statementTitle}</h2>
        <p className="text-xl font-bold">{employer.name}</p>
        {workerName.trim() && <p className="text-[#6B6259]">{workerName.trim()}</p>}
        <p className="text-sm text-[#6B6259]">{localISODate()}</p>

        <table className="mt-4 w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-[#EADFCB] text-sm text-[#6B6259]">
              <th className="py-2 pr-2">{t.colDate}</th>
              <th className="py-2 pr-2">{t.colType}</th>
              <th className="py-2 pr-2 text-right">{t.colAmount}</th>
              <th className="py-2">{t.colRecordedBy}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-[#EADFCB]">
                <td className="whitespace-nowrap py-2 pr-2">{r[0]}</td>
                <td className="py-2 pr-2">{r[1]}</td>
                <td className="py-2 pr-2 text-right font-bold tabular-nums">{r[2]}</td>
                <td className="py-2 text-sm text-[#6B6259]">{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 well p-3.5">
          <dt className="text-[#6B6259]">{t.earned}</dt>
          <dd className="text-right font-bold tabular-nums">{inr(totals.earned)}</dd>
          <dt className="text-[#6B6259]">{t.advances}</dt>
          <dd className="text-right font-bold tabular-nums">{inr(totals.advances)}</dd>
          <dt className="text-[#6B6259]">{t.payments}</dt>
          <dd className="text-right font-bold tabular-nums">{inr(totals.payments)}</dd>
          <dt className="border-t border-[#E3D6BE] pt-1.5 text-lg font-extrabold text-[#C2570C]">{t.outstanding}</dt>
          <dd className="border-t border-[#E3D6BE] pt-1.5 text-right text-lg font-extrabold tabular-nums text-[#C2570C]">{inr(totals.outstanding)}</dd>
        </dl>

        <p className="mt-4 text-sm text-[#6B6259]">{t.footerNote}</p>
      </article>
    </div>
  );
}

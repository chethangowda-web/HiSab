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
        <button type="button" onClick={onBack} className="h-12 rounded-full border border-[#324B22] bg-[#16220F] px-5 text-base font-bold text-[#F3F7EC]">
          {t.back}
        </button>
        <button type="button" onClick={() => window.print()} className="h-12 rounded-full bg-[#C9F43A] px-5 text-base font-extrabold text-[#0B1307]">
          {t.savePdf}
        </button>
        <button
          type="button"
          onClick={() => void shareSummary(buildSummaryText(entries, employer, lang, workerName), t.statementTitle)}
          className="h-12 rounded-full border border-[#3E5E2A] bg-[#1B2B12] px-5 text-base font-bold text-[#D9F76E]"
        >
          {t.shareSummary}
        </button>
      </div>

      <article data-testid="statement" className="print-area fintech-card p-5 text-[#F3F7EC]">
        <h2 className="text-2xl font-extrabold text-[#D9F76E]">{t.statementTitle}</h2>
        <p className="text-xl font-bold">{employer.name}</p>
        {workerName.trim() && <p className="text-[#B8C9AA]">{workerName.trim()}</p>}
        <p className="text-sm text-[#8EA37D]">{localISODate()}</p>

        <table className="mt-4 w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-[#344E24] text-sm text-[#9BB08B]">
              <th className="py-2 pr-2">{t.colDate}</th>
              <th className="py-2 pr-2">{t.colType}</th>
              <th className="py-2 pr-2 text-right">{t.colAmount}</th>
              <th className="py-2">{t.colRecordedBy}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-[#25381A]">
                <td className="whitespace-nowrap py-2 pr-2">{r[0]}</td>
                <td className="py-2 pr-2">{r[1]}</td>
                <td className="py-2 pr-2 text-right font-bold tabular-nums">{r[2]}</td>
                <td className="py-2 text-sm text-[#B8C9AA]">{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-2xl border border-[#25381A] bg-[#0F180A] p-3.5">
          <dt className="text-[#9BB08B]">{t.earned}</dt>
          <dd className="text-right font-bold tabular-nums">{inr(totals.earned)}</dd>
          <dt className="text-[#9BB08B]">{t.advances}</dt>
          <dd className="text-right font-bold tabular-nums">{inr(totals.advances)}</dd>
          <dt className="text-[#9BB08B]">{t.payments}</dt>
          <dd className="text-right font-bold tabular-nums">{inr(totals.payments)}</dd>
          <dt className="border-t border-[#2C421E] pt-1.5 text-lg font-extrabold text-[#D9F76E]">{t.outstanding}</dt>
          <dd className="border-t border-[#2C421E] pt-1.5 text-right text-lg font-extrabold tabular-nums text-[#D9F76E]">{inr(totals.outstanding)}</dd>
        </dl>

        <p className="mt-4 text-sm text-[#8EA37D]">{t.footerNote}</p>
      </article>
    </div>
  );
}

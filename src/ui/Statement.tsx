import { useState } from 'react';
import { localISODate } from '../domain/dates';
import { buildReceiptPayload, encodeReceipt } from '../domain/receipt';
import { buildStatementRows, buildSummaryText, shareSummary } from '../domain/statement';
import { inr } from '../i18n/ui';
import { useApp } from './AppContext';
import { whatsappUrl } from './useDialogue';

/**
 * A printable wage statement plus two-party shareable Trust Receipt link.
 * "Save as PDF" uses the browser's print dialog, because the browser
 * shapes Kannada and Hindi text correctly (a hand-built PDF library does not).
 */
export default function Statement({ employerId, onBack }: { employerId: string; onBack: () => void }) {
  const { t, lang, entries, employers, workerName } = useApp();
  const [copied, setCopied] = useState(false);
  const employer = employers.find((e) => e.id === employerId);
  if (!employer) return null;
  const { rows, totals } = buildStatementRows(entries, employer, lang);
  const receipt = buildReceiptPayload(entries, employer, lang, workerName);
  const verifyLink = (() => {
    try {
      return `${window.location.origin}/?verify=${encodeReceipt(receipt)}`;
    } catch {
      return `/?verify=${encodeReceipt(receipt)}`;
    }
  })();

  const copyVerify = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: `${employer.name} · ${t.statementTitle}`, text: `BoliHisab receipt (${inr(totals.outstanding)} owed)`, url: verifyLink });
        return;
      }
      await navigator.clipboard?.writeText(verifyLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // user dismissed share sheet
    }
  };

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
          className="btn btn-ghost px-5 text-[#FFB27A]"
        >
          {t.shareSummary}
        </button>
      </div>

      <article data-testid="statement" className="print-area sheet-panel p-5 text-[#F5F3FA]">
        <h2 className="text-2xl font-extrabold text-[#FF9A4D]">{t.statementTitle}</h2>
        <p className="text-xl font-bold">{employer.name}</p>
        {workerName.trim() && <p className="text-[#ABA5BD]">{workerName.trim()}</p>}
        <p className="text-sm text-[#ABA5BD]">{localISODate()}</p>

        <table className="mt-4 w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-white/10 text-sm text-[#ABA5BD]">
              <th className="py-2 pr-2">{t.colDate}</th>
              <th className="py-2 pr-2">{t.colType}</th>
              <th className="py-2 pr-2 text-right">{t.colAmount}</th>
              <th className="py-2">{t.colRecordedBy}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-white/10">
                <td className="whitespace-nowrap py-2 pr-2">{r[0]}</td>
                <td className="py-2 pr-2">{r[1]}</td>
                <td className="py-2 pr-2 text-right font-bold tabular-nums">{r[2]}</td>
                <td className="py-2 text-sm text-[#ABA5BD]">{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 well p-3.5">
          <dt className="text-[#ABA5BD]">{t.earned}</dt>
          <dd className="text-right font-bold tabular-nums">{inr(totals.earned)}</dd>
          <dt className="text-[#ABA5BD]">{t.advances}</dt>
          <dd className="text-right font-bold tabular-nums">{inr(totals.advances)}</dd>
          <dt className="text-[#ABA5BD]">{t.payments}</dt>
          <dd className="text-right font-bold tabular-nums">{inr(totals.payments)}</dd>
          <dt className="border-t border-white/10 pt-1.5 text-lg font-extrabold text-[#FF9A4D]">{t.outstanding}</dt>
          <dd className="border-t border-white/10 pt-1.5 text-right text-lg font-extrabold tabular-nums text-[#FF9A4D]">{inr(totals.outstanding)}</dd>
        </dl>

        <p className="mt-4 text-sm text-[#ABA5BD]">{t.footerNote}</p>
      </article>

      <section data-testid="trust-receipt-bar" className="no-print card flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow">Two-party verification</span>
          <span className="pill border border-white/10 bg-white/[0.05] text-[#D9D5E6]">
            {receipt.vp > 0 ? `🎙 ${receipt.vp}/${receipt.n} voice proofs` : `📒 ${receipt.n} entries`}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-[#9E97B5]">
          Send a tamper-checked wage receipt link so {employer.name} can review totals and confirm via WhatsApp.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void copyVerify()} className="btn btn-ghost flex-1 text-sm">
            {copied ? '✓ Link copied' : '🔗 Share verify link'}
          </button>
          <a
            href={whatsappUrl(`Please verify our BoliHisab wage summary (${inr(totals.outstanding)} owed): ${verifyLink}`)}
            target="_blank"
            rel="noopener"
            className="btn btn-primary flex-1 text-sm"
          >
            📲 WhatsApp sign-off
          </a>
        </div>
      </section>
    </div>
  );
}

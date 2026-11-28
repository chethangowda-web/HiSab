import { lastNDays, localISODate } from '../domain/dates';
import type { Draft } from '../domain/types';
import { friendlyDate, typeLabel } from '../i18n/messages';
import { inr } from '../i18n/ui';
import { useApp } from './AppContext';
import ClipButton from './ClipButton';
import { TYPE_STYLE } from './typeStyle';

export function YesNo({ onYes, onNo, yesLabel, noLabel }: { onYes: () => void; onNo: () => void; yesLabel?: string; noLabel?: string }) {
  const { t } = useApp();
  return (
    <div className="mt-5 grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={onYes}
        className="btn btn-primary h-16 gap-2 px-2 text-2xl"
      >
        <span aria-hidden="true">✓</span>
        {yesLabel ?? t.yes}
      </button>
      <button
        type="button"
        onClick={onNo}
        className="btn btn-ghost h-16 gap-2 px-2 text-2xl"
      >
        <span aria-hidden="true">✕</span>
        {noLabel ?? t.no}
      </button>
    </div>
  );
}

/** The entry the app understood, shown as a confirmation card. */
export default function ConfirmCard({ draft, clip, onYes, onNo }: { draft: Draft; clip?: Blob; onYes: () => void; onNo: () => void }) {
  const { t, lang } = useApp();
  if (!draft.type || draft.amount === undefined) return null;
  const style = TYPE_STYLE[draft.type];
  const today = localISODate();
  const days = draft.days && draft.days > 1 ? draft.days : 1;
  const dates = days > 1 ? lastNDays(draft.date ?? today, days) : [];

  return (
    <section data-testid="confirm-card" className="card w-full overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#EADFCB] bg-[#FDEEDE] px-5 py-3">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl">
            {style.icon}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-[#6B6259]">
              {typeLabel(lang, draft.type)}
              {draft.hours !== undefined ? ` · ${draft.hours} ${t.hoursUnit}` : ''}
            </p>
            <p className="break-words text-xl font-extrabold text-[#1C1917]">{draft.employerName}</p>
          </div>
        </div>
        {days === 1 && <p className="text-xs font-bold text-[#6B6259]">{friendlyDate(lang, draft.date ?? today, today)}</p>}
      </div>

      <div className="p-5">
        {days > 1 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {dates.map((d) => (
              <span key={d} data-testid="day-chip" className="rounded-full bg-[#F3ECDD] px-3 py-1 text-sm font-semibold text-[#1C1917]">
                {friendlyDate(lang, d, today).replace(/ \d{4}$/, '')}
              </span>
            ))}
          </div>
        )}
        {days > 1 && (
          <p className="text-lg font-semibold text-[#6B6259] tabular-nums">
            {days} × {inr(draft.amount)}
          </p>
        )}
        <p className={`text-5xl font-extrabold tracking-tight tabular-nums ${style.amount}`}>{inr(draft.amount * days)}</p>

        {draft.amountFrom === 'rate' && (
          <p className="mt-3 flex items-center gap-2 rounded-2xl bg-[#FDEEDE] px-3.5 py-2.5 text-sm font-semibold text-[#9A3F06]">
            <span aria-hidden="true">⭐</span>
            {inr(draft.amount)} = {t.usualRateOf.replace('{name}', draft.employerName ?? '')}
          </p>
        )}

        {clip && (
          <p data-testid="clip-preview" className="mt-3 flex items-center gap-3 well px-3.5 py-2.5 text-[#1C1917]">
            <ClipButton blob={clip} />
            <span className="font-bold">🎙 {t.voiceProof}</span>
          </p>
        )}

        <YesNo onYes={onYes} onNo={onNo} />
      </div>
    </section>
  );
}

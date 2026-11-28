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
        className="flex h-16 items-center justify-center gap-2 rounded-full bg-[#C9F43A] px-2 text-2xl font-extrabold text-[#0B1307] shadow-md transition active:scale-[0.98]"
      >
        <span aria-hidden="true">✓</span>
        {yesLabel ?? t.yes}
      </button>
      <button
        type="button"
        onClick={onNo}
        className="flex h-16 items-center justify-center gap-2 rounded-full border border-[#324B22] bg-[#101A0A] px-2 text-2xl font-bold text-[#F3F7EC] transition active:scale-[0.98]"
      >
        <span aria-hidden="true">✕</span>
        {noLabel ?? t.no}
      </button>
    </div>
  );
}

/** The entry the app understood, styled as an Obsidian & Acid Lime fintech confirmation card. */
export default function ConfirmCard({ draft, clip, onYes, onNo }: { draft: Draft; clip?: Blob; onYes: () => void; onNo: () => void }) {
  const { t, lang } = useApp();
  if (!draft.type || draft.amount === undefined) return null;
  const style = TYPE_STYLE[draft.type];
  const today = localISODate();
  const days = draft.days && draft.days > 1 ? draft.days : 1;
  const dates = days > 1 ? lastNDays(draft.date ?? today, days) : [];

  return (
    <section data-testid="confirm-card" className="fintech-card w-full overflow-hidden">
      <div className="lime-bowl flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0B1307] text-2xl">
            {style.icon}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-[#263817]">
              {typeLabel(lang, draft.type)}
              {draft.hours !== undefined ? ` · ${draft.hours} ${t.hoursUnit}` : ''}
            </p>
            <p className="break-words text-xl font-extrabold text-[#0B1307]">{draft.employerName}</p>
          </div>
        </div>
        {days === 1 && <p className="text-xs font-bold text-[#1F2F12]">{friendlyDate(lang, draft.date ?? today, today)}</p>}
      </div>

      <div className="p-5">
        {days > 1 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {dates.map((d) => (
              <span key={d} data-testid="day-chip" className="rounded-full border border-[#324B22] bg-[#101A0A] px-3 py-1 text-sm font-semibold text-[#D9F76E]">
                {friendlyDate(lang, d, today).replace(/ \d{4}$/, '')}
              </span>
            ))}
          </div>
        )}
        {days > 1 && (
          <p className="text-lg font-semibold text-[#B8C9AA] tabular-nums">
            {days} × {inr(draft.amount)}
          </p>
        )}
        <p className={`text-5xl font-extrabold tracking-tight tabular-nums ${style.amount}`}>{inr(draft.amount * days)}</p>

        {draft.amountFrom === 'rate' && (
          <p className="mt-3 flex items-center gap-2 rounded-2xl border border-[#44632D] bg-[#1B2B12] px-3.5 py-2.5 text-sm font-semibold text-[#D9F76E]">
            <span aria-hidden="true">⭐</span>
            {inr(draft.amount)} = {t.usualRateOf.replace('{name}', draft.employerName ?? '')}
          </p>
        )}

        {clip && (
          <p data-testid="clip-preview" className="mt-3 flex items-center gap-3 rounded-2xl border border-[#2C441E] bg-[#101A0A] px-3.5 py-2.5 text-[#E5F0D8]">
            <ClipButton blob={clip} />
            <span className="font-bold">🎙 {t.voiceProof}</span>
          </p>
        )}

        <YesNo onYes={onYes} onNo={onNo} />
      </div>
    </section>
  );
}

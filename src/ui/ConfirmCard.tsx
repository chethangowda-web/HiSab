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
        className="flex h-16 items-center justify-center gap-2 rounded-2xl bg-teal-700 px-2 text-2xl font-bold text-white active:scale-[0.98] active:bg-teal-800"
      >
        <span aria-hidden="true">✓</span>
        {yesLabel ?? t.yes}
      </button>
      <button
        type="button"
        onClick={onNo}
        className="flex h-16 items-center justify-center gap-2 rounded-2xl bg-slate-200 px-2 text-2xl font-bold text-slate-900 active:scale-[0.98] active:bg-slate-300"
      >
        <span aria-hidden="true">✕</span>
        {noLabel ?? t.no}
      </button>
    </div>
  );
}

/** The entry the app understood, shown big so a worker can check it at a glance before saying yes. */
export default function ConfirmCard({ draft, clip, onYes, onNo }: { draft: Draft; clip?: Blob; onYes: () => void; onNo: () => void }) {
  const { t, lang } = useApp();
  if (!draft.type || draft.amount === undefined) return null;
  const style = TYPE_STYLE[draft.type];
  const today = localISODate();
  const days = draft.days && draft.days > 1 ? draft.days : 1;
  const dates = days > 1 ? lastNDays(draft.date ?? today, days) : [];

  return (
    <section data-testid="confirm-card" className="w-full rounded-3xl bg-white p-5 shadow-lg ring-2 ring-teal-600">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className={`flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${style.chip}`}>
          {style.icon}
        </span>
        <div className="min-w-0">
          <p className="text-base font-semibold text-slate-600">
            {typeLabel(lang, draft.type)}
            {draft.hours !== undefined ? ` · ${draft.hours} ${t.hoursUnit}` : ''}
          </p>
          <p className="break-words text-2xl font-bold">{draft.employerName}</p>
        </div>
      </div>

      {days > 1 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {dates.map((d) => (
            <span key={d} data-testid="day-chip" className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-semibold">
              {friendlyDate(lang, d, today).replace(/ \d{4}$/, '')}
            </span>
          ))}
        </div>
      )}
      {days > 1 && (
        <p className="mt-3 text-lg text-slate-600">
          {days} × {inr(draft.amount)}
        </p>
      )}
      <p className={`${days > 1 ? '' : 'mt-4 '}text-5xl font-extrabold tracking-tight ${style.amount}`}>{inr(draft.amount * days)}</p>
      {days === 1 && <p className="mt-1 text-lg text-slate-600">{friendlyDate(lang, draft.date ?? today, today)}</p>}

      {draft.amountFrom === 'rate' && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-amber-900">
          <span aria-hidden="true">⭐</span>
          {inr(draft.amount)} = {t.usualRateOf.replace('{name}', draft.employerName ?? '')}
        </p>
      )}

      {clip && (
        <p data-testid="clip-preview" className="mt-3 flex items-center gap-3 rounded-xl bg-sky-50 px-3 py-2 text-sky-900">
          <ClipButton blob={clip} />
          <span className="font-semibold">🎙 {t.voiceProof}</span>
        </p>
      )}

      <YesNo onYes={onYes} onNo={onNo} />
    </section>
  );
}

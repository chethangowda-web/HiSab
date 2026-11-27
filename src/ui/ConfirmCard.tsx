import { localISODate } from '../domain/dates';
import type { Draft } from '../domain/types';
import { friendlyDate, typeLabel } from '../i18n/messages';
import { inr } from '../i18n/ui';
import { useApp } from './AppContext';
import { TYPE_STYLE } from './typeStyle';

/** The entry the app understood, shown big so a worker can check it at a glance before saying yes. */
export default function ConfirmCard({ draft, onYes, onNo }: { draft: Draft; onYes: () => void; onNo: () => void }) {
  const { t, lang } = useApp();
  if (!draft.type || draft.amount === undefined) return null;
  const style = TYPE_STYLE[draft.type];

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
          <p className="truncate text-2xl font-bold">{draft.employerName}</p>
        </div>
      </div>
      <p className={`mt-4 text-5xl font-extrabold tracking-tight ${style.amount}`}>{inr(draft.amount)}</p>
      <p className="mt-1 text-lg text-slate-600">{friendlyDate(lang, draft.date ?? localISODate(), localISODate())}</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onYes}
          className="flex h-16 items-center justify-center gap-2 rounded-2xl bg-teal-700 text-2xl font-bold text-white active:scale-[0.98] active:bg-teal-800"
        >
          <span aria-hidden="true">✓</span>
          {t.yes}
        </button>
        <button
          type="button"
          onClick={onNo}
          className="flex h-16 items-center justify-center gap-2 rounded-2xl bg-slate-200 text-2xl font-bold text-slate-900 active:scale-[0.98] active:bg-slate-300"
        >
          <span aria-hidden="true">✕</span>
          {t.no}
        </button>
      </div>
    </section>
  );
}

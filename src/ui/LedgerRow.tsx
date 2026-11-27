import { useState } from 'react';
import { confirmByEmployer, deleteEntry, updateEntry } from '../db/db';
import { localISODate } from '../domain/dates';
import { validateEdit } from '../domain/edit';
import type { Entry } from '../domain/types';
import { typeLabel } from '../i18n/messages';
import { inr } from '../i18n/ui';
import { useApp } from './AppContext';
import ClipButton from './ClipButton';
import { TYPE_STYLE } from './typeStyle';

type Mode = 'view' | 'edit' | 'delete';

const btn = 'h-12 rounded-xl px-4 text-base font-semibold active:opacity-80';

export default function LedgerRow({ entry, employerName }: { entry: Entry; employerName: string }) {
  const { t, lang, reload } = useApp();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('view');
  const [amount, setAmount] = useState(String(entry.amount));
  const [date, setDate] = useState(entry.date);
  const [error, setError] = useState('');
  const style = TYPE_STYLE[entry.type];

  const startEdit = () => {
    setAmount(String(entry.amount));
    setDate(entry.date);
    setError('');
    setMode('edit');
  };

  const saveEdit = async () => {
    const check = validateEdit({ amount: Number(amount), date }, localISODate());
    if (!check.ok) {
      setError(check.reason === 'bad_amount' ? t.invalidAmount : check.reason === 'bad_date' ? t.invalidDate : t.futureDate);
      return;
    }
    await updateEntry(entry.id, { amount: Number(amount), date });
    await reload();
    setMode('view');
    setOpen(false);
  };

  return (
    <li data-testid="ledger-row" data-date={entry.date} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${style.chip}`}>
          {style.icon}
        </span>
        <div data-testid="row-main" className="min-w-0 flex-1">
          <p className="break-words text-lg font-bold leading-snug">{employerName}</p>
          <p className="text-slate-600">
            {typeLabel(lang, entry.type)}
            {entry.hours !== undefined ? ` · ${entry.hours} ${t.hoursUnit}` : ''}
          </p>
          <span
            className={`mt-1 inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              entry.source === 'employer_confirmed' ? 'bg-teal-100 text-teal-900' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {entry.source === 'employer_confirmed' ? t.employerConfirmed : t.workerRecorded}
          </span>
          {entry.clipId && (
            <div className="mt-2 flex items-center gap-2">
              <ClipButton clipId={entry.clipId} />
              <span className="whitespace-nowrap rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-900">🎙 {t.voiceProof}</span>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <p className={`text-xl font-extrabold ${style.amount}`}>{inr(entry.amount)}</p>
          <button
            type="button"
            aria-label={t.moreActions}
            aria-expanded={open}
            onClick={() => {
              setOpen((o) => !o);
              setMode('view');
            }}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl text-slate-600 active:bg-slate-100"
          >
            <span aria-hidden="true">{open ? '▴' : '⋯'}</span>
          </button>
        </div>
      </div>

      {open && mode === 'view' && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          {entry.source === 'worker' && (
            <button
              type="button"
              onClick={() =>
                void confirmByEmployer(entry.id)
                  .then(reload)
                  .then(() => setOpen(false))
              }
              className={`${btn} bg-teal-100 text-teal-900`}
            >
              {t.confirmByEmployer}
            </button>
          )}
          <button type="button" onClick={startEdit} className={`${btn} bg-slate-200 text-slate-900`}>
            {t.edit}
          </button>
          <button type="button" onClick={() => setMode('delete')} className={`${btn} bg-red-100 text-red-900`}>
            {t.delete}
          </button>
        </div>
      )}

      {mode === 'edit' && (
        <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3">
          <label className="flex flex-col gap-1">
            <span className="text-slate-600">{t.amountLabel}</span>
            <input
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-12 rounded-xl border border-slate-300 px-3 text-xl"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-slate-600">{t.dateLabel}</span>
            <input
              type="date"
              value={date}
              max={localISODate()}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 rounded-xl border border-slate-300 px-3 text-xl"
            />
          </label>
          {error && (
            <p role="alert" className="font-semibold text-red-800">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => void saveEdit()} className={`${btn} bg-teal-700 text-white`}>
              {t.save}
            </button>
            <button type="button" onClick={() => setMode('view')} className={`${btn} bg-slate-200 text-slate-900`}>
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {mode === 'delete' && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-lg font-semibold">{t.deleteAsk}</span>
          <button type="button" onClick={() => void deleteEntry(entry.id).then(reload)} className={`${btn} bg-red-700 text-white`}>
            {t.yes}
          </button>
          <button type="button" onClick={() => setMode('view')} className={`${btn} bg-slate-200 text-slate-900`}>
            {t.no}
          </button>
        </div>
      )}
    </li>
  );
}

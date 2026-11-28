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

const btn = 'h-12 rounded-full px-4 text-base font-bold transition active:scale-95';

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
    <li data-testid="ledger-row" data-date={entry.date} className="fintech-row p-3.5">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${style.chip}`}>
          {style.icon}
        </span>
        <div data-testid="row-main" className="min-w-0 flex-1">
          <p className="break-words text-lg font-bold leading-snug text-[#F3F7EC]">{employerName}</p>
          <p className="text-sm font-medium text-[#9BB08B]">
            {typeLabel(lang, entry.type)}
            {entry.hours !== undefined ? ` · ${entry.hours} ${t.hoursUnit}` : ''}
          </p>
          <span
            className={`mt-1.5 inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${
              entry.source === 'employer_confirmed' ? 'bg-[#1D3525] text-[#4ADE80] ring-1 ring-[#2D553B]' : 'bg-[#213118] text-[#B8C9AA]'
            }`}
          >
            {entry.source === 'employer_confirmed' ? t.employerConfirmed : t.workerRecorded}
          </span>
          {entry.clipId && (
            <div className="mt-2 flex items-center gap-2">
              <ClipButton clipId={entry.clipId} />
              <span className="whitespace-nowrap rounded-full border border-[#324B22] bg-[#101A0A] px-2.5 py-0.5 text-xs font-bold text-[#D9F76E]">
                🎙 {t.voiceProof}
              </span>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <p className={`text-xl font-extrabold tabular-nums ${style.amount}`}>{inr(entry.amount)}</p>
          <button
            type="button"
            aria-label={t.moreActions}
            aria-expanded={open}
            onClick={() => {
              setOpen((o) => !o);
              setMode('view');
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#213118] text-xl text-[#D9F76E] transition hover:bg-[#2B401E]"
          >
            <span aria-hidden="true">{open ? '▴' : '⋯'}</span>
          </button>
        </div>
      </div>

      {open && mode === 'view' && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-[#263A1A] pt-3">
          {entry.source === 'worker' && (
            <button
              type="button"
              onClick={() =>
                void confirmByEmployer(entry.id)
                  .then(reload)
                  .then(() => setOpen(false))
              }
              className={`${btn} bg-[#C9F43A] text-[#0B1307]`}
            >
              {t.confirmByEmployer}
            </button>
          )}
          <button type="button" onClick={startEdit} className={`${btn} border border-[#344E24] bg-[#1F3017] text-[#F3F7EC]`}>
            {t.edit}
          </button>
          <button type="button" onClick={() => setMode('delete')} className={`${btn} border border-rose-500/40 bg-rose-950/80 text-rose-200`}>
            {t.delete}
          </button>
        </div>
      )}

      {mode === 'edit' && (
        <div className="mt-3 flex flex-col gap-3 border-t border-[#263A1A] pt-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase text-[#9BB08B]">{t.amountLabel}</span>
            <input
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-12 rounded-2xl border border-[#344E24] bg-[#0D1609] px-4 text-xl font-bold text-[#F3F7EC]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase text-[#9BB08B]">{t.dateLabel}</span>
            <input
              type="date"
              value={date}
              max={localISODate()}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 rounded-2xl border border-[#344E24] bg-[#0D1609] px-4 text-xl font-bold text-[#F3F7EC]"
            />
          </label>
          {error && (
            <p role="alert" className="rounded-xl bg-rose-950/70 px-3 py-1.5 font-semibold text-rose-200">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => void saveEdit()} className={`${btn} bg-[#C9F43A] text-[#0B1307]`}>
              {t.save}
            </button>
            <button type="button" onClick={() => setMode('view')} className={`${btn} border border-[#344E24] bg-[#1F3017] text-[#F3F7EC]`}>
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {mode === 'delete' && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#263A1A] pt-3">
          <span className="text-lg font-bold text-[#F3F7EC]">{t.deleteAsk}</span>
          <button type="button" onClick={() => void deleteEntry(entry.id).then(reload)} className={`${btn} bg-rose-600 text-white`}>
            {t.yes}
          </button>
          <button type="button" onClick={() => setMode('view')} className={`${btn} border border-[#344E24] bg-[#1F3017] text-[#F3F7EC]`}>
            {t.no}
          </button>
        </div>
      )}
    </li>
  );
}

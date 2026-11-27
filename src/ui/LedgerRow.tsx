import { useState } from 'react';
import { confirmByEmployer, deleteEntry, updateEntry } from '../db/db';
import { localISODate } from '../domain/dates';
import { validateEdit } from '../domain/edit';
import type { Entry } from '../domain/types';
import { typeLabel } from '../i18n/messages';
import { inr } from '../i18n/ui';
import { useApp } from './AppContext';

type Mode = 'view' | 'edit' | 'delete';

const btn = 'h-12 rounded-xl px-4 text-base font-semibold';

export default function LedgerRow({ entry, employerName }: { entry: Entry; employerName: string }) {
  const { t, lang, reload } = useApp();
  const [mode, setMode] = useState<Mode>('view');
  const [amount, setAmount] = useState(String(entry.amount));
  const [date, setDate] = useState(entry.date);
  const [error, setError] = useState('');

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
  };

  return (
    <li data-testid="ledger-row" data-date={entry.date} className="rounded-2xl bg-white p-4 shadow">
      <div className="flex items-baseline justify-between">
        <span className="text-xl font-semibold">{employerName}</span>
        <span className={`text-xl font-bold ${entry.type === 'work' || entry.type === 'overtime' ? 'text-teal-800' : 'text-orange-700'}`}>
          {inr(entry.amount)}
        </span>
      </div>
      <div className="flex items-center justify-between text-slate-600">
        <span>
          {typeLabel(lang, entry.type)}
          {entry.hours !== undefined ? ` · ${entry.hours}h` : ''} · {entry.date}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-sm ${
            entry.source === 'employer_confirmed' ? 'bg-teal-100 text-teal-900' : 'bg-slate-200 text-slate-800'
          }`}
        >
          {entry.source === 'employer_confirmed' ? t.employerConfirmed : t.workerRecorded}
        </span>
      </div>

      {mode === 'view' && (
        <div className="mt-3 flex flex-wrap gap-2">
          {entry.source === 'worker' && (
            <button type="button" onClick={() => void confirmByEmployer(entry.id).then(reload)} className={`${btn} bg-teal-100 text-teal-900`}>
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
        <div className="mt-3 flex flex-col gap-3">
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
            <p role="alert" className="text-red-800">
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
        <div className="mt-3 flex flex-wrap items-center gap-2">
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

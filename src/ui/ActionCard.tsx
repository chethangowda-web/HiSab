import type { PendingAction } from '../voice/dialogue';
import { inr } from '../i18n/ui';
import { useApp } from './AppContext';
import Avatar from './Avatar';
import { YesNo } from './ConfirmCard';
import { whatsappUrl } from './useDialogue';

/** A spoken command waiting for yes/no: delete the last entry, set a rate, or send a reminder. */
export default function ActionCard({ action, onYes, onNo }: { action: PendingAction; onYes: () => void; onNo: () => void }) {
  const { t, employers } = useApp();

  if (action.kind === 'remind') {
    const name = employers.find((e) => e.id === action.employerId)?.name ?? '';
    // Open WhatsApp inside the tap itself (browsers block pop-ups that are not caused by a tap).
    const send = () => {
      window.open(whatsappUrl(action.text), '_blank', 'noopener');
      onYes();
    };
    return (
      <section data-testid="reminder-card" className="w-full overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-slate-200">
        <div className="flex items-center gap-2 bg-[#075e54] px-4 py-3 text-white">
          <Avatar name={name} size="h-9 w-9 text-base" />
          <span className="font-semibold">{name}</span>
          <span className="ml-auto text-xs opacity-80">{t.whatsappPreview}</span>
        </div>
        <div className="bg-[#ece5dd] p-4">
          <p className="ml-auto max-w-[90%] whitespace-pre-line rounded-2xl rounded-tr-sm bg-[#dcf8c6] p-3 text-[17px] leading-snug shadow">{action.text}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          <button type="button" onClick={send} className="h-16 rounded-2xl bg-[#25d366] px-2 text-lg font-bold text-white active:opacity-90">
            <span aria-hidden="true">📲 </span>
            {t.sendWhatsApp}
          </button>
          <button type="button" onClick={onNo} className="h-16 rounded-2xl bg-slate-200 text-xl font-bold text-slate-900">
            <span aria-hidden="true">✕ </span>
            {t.no}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section data-testid="action-card" className="w-full rounded-3xl bg-white p-5 shadow-lg ring-2 ring-amber-500">
      {action.kind === 'delete' && (
        <>
          <p className="text-2xl font-bold">
            <span aria-hidden="true">🗑️ </span>
            {t.deleteAsk}
          </p>
          <p className="mt-2 text-lg text-slate-700">{action.question.replace(/^[^:]*:\s*/, '').replace(/\?.*$/, '')}</p>
        </>
      )}
      {action.kind === 'rate' && (
        <>
          <p className="text-lg font-semibold text-slate-600">
            <span aria-hidden="true">⭐ </span>
            {t.rateTitle}
          </p>
          <p className="mt-1 text-2xl font-bold">{action.name}</p>
          <p className="mt-2 text-5xl font-extrabold text-teal-800">
            {inr(action.rate)} <span className="text-2xl font-bold text-slate-500">{t.perDayUnit}</span>
          </p>
        </>
      )}
      <YesNo onYes={onYes} onNo={onNo} />
    </section>
  );
}

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
      <section data-testid="reminder-card" className="card w-full overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-[#EADFCB] bg-[#FDEEDE] px-4 py-3">
          <Avatar name={name} size="h-9 w-9 text-base" />
          <span className="font-extrabold text-[#1C1917]">{name}</span>
          <span className="ml-auto rounded-full pill bg-white text-[#9A3F06]">{t.whatsappPreview}</span>
        </div>
        <div className="bg-[#F6EFE2] p-4">
          <p className="ml-auto max-w-[92%] whitespace-pre-line rounded-2xl rounded-tr-sm bg-[#DCF8C6] p-3.5 text-[17px] leading-snug text-[#1C1917] shadow-sm">
            {action.text}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          <button type="button" onClick={send} className="btn btn-primary h-16 px-2 text-lg">
            <span aria-hidden="true">📲 </span>
            {t.sendWhatsApp}
          </button>
          <button type="button" onClick={onNo} className="btn btn-ghost h-16 text-xl">
            <span aria-hidden="true">✕ </span>
            {t.no}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section data-testid="action-card" className="card w-full p-5">
      {action.kind === 'delete' && (
        <>
          <p className="text-2xl font-extrabold text-[#B42318]">
            <span aria-hidden="true">🗑️ </span>
            {t.deleteAsk}
          </p>
          <p className="mt-2 text-lg text-[#6B6259]">{action.question.replace(/^[^:]*:\s*/, '').replace(/\?.*$/, '')}</p>
        </>
      )}
      {action.kind === 'rate' && (
        <>
          <p className="text-base font-bold text-[#6B6259]">
            <span aria-hidden="true">⭐ </span>
            {t.rateTitle}
          </p>
          <p className="mt-1 text-2xl font-extrabold text-[#1C1917]">{action.name}</p>
          <p className="mt-2 text-5xl font-extrabold tabular-nums text-[#C2570C]">
            {inr(action.rate)} <span className="text-2xl font-bold text-[#6B6259]">{t.perDayUnit}</span>
          </p>
        </>
      )}
      <YesNo onYes={onYes} onNo={onNo} />
    </section>
  );
}

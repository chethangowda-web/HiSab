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
      <section data-testid="reminder-card" className="fintech-card w-full overflow-hidden">
        <div className="lime-bowl flex items-center gap-2.5 px-4 py-3">
          <Avatar name={name} size="h-9 w-9 text-base" />
          <span className="font-extrabold text-[#0B1307]">{name}</span>
          <span className="ml-auto rounded-full bg-[#0B1307] px-2.5 py-0.5 text-xs font-bold text-[#D9F76E]">{t.whatsappPreview}</span>
        </div>
        <div className="bg-[#0E1709] p-4">
          <p className="ml-auto max-w-[92%] whitespace-pre-line rounded-2xl rounded-tr-sm border border-[#345023] bg-[#1D3014] p-3.5 text-[17px] leading-snug text-[#F1F6E8] shadow">
            {action.text}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          <button type="button" onClick={send} className="h-16 rounded-full bg-[#C9F43A] px-2 text-lg font-extrabold text-[#0B1307] active:scale-[0.98]">
            <span aria-hidden="true">📲 </span>
            {t.sendWhatsApp}
          </button>
          <button type="button" onClick={onNo} className="h-16 rounded-full border border-[#324B22] bg-[#101A0A] text-xl font-bold text-[#F3F7EC]">
            <span aria-hidden="true">✕ </span>
            {t.no}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section data-testid="action-card" className="fintech-card w-full p-5">
      {action.kind === 'delete' && (
        <>
          <p className="text-2xl font-extrabold text-rose-300">
            <span aria-hidden="true">🗑️ </span>
            {t.deleteAsk}
          </p>
          <p className="mt-2 text-lg text-[#C7D6B8]">{action.question.replace(/^[^:]*:\s*/, '').replace(/\?.*$/, '')}</p>
        </>
      )}
      {action.kind === 'rate' && (
        <>
          <p className="text-base font-bold text-[#9BB08B]">
            <span aria-hidden="true">⭐ </span>
            {t.rateTitle}
          </p>
          <p className="mt-1 text-2xl font-extrabold text-[#F3F7EC]">{action.name}</p>
          <p className="mt-2 text-5xl font-extrabold tabular-nums text-[#C9F43A]">
            {inr(action.rate)} <span className="text-2xl font-bold text-[#9BB08B]">{t.perDayUnit}</span>
          </p>
        </>
      )}
      <YesNo onYes={onYes} onNo={onNo} />
    </section>
  );
}

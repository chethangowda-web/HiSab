import { decodeReceipt } from '../domain/receipt';
import { inr } from '../i18n/ui';
import { whatsappUrl } from './useDialogue';

/**
 * Interactive two-party Wage Receipt view shown when an employer/judge opens a `?verify=...` link.
 */
export default function VerifyView({ token, onDismiss }: { token: string; onDismiss: () => void }) {
  const res = decodeReceipt(token);

  if (!res.ok) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-4 px-4">
        <section className="sheet-panel p-6 text-center">
          <p className="text-3xl">⚠️</p>
          <h1 className="mt-2 text-xl font-extrabold text-white">Invalid receipt link</h1>
          <p className="mt-2 text-sm text-[#9E97B5]">This BoliHisab verification link is incomplete or corrupted.</p>
          <button type="button" onClick={onDismiss} className="btn btn-primary mt-5 w-full">
            Open BoliHisab
          </button>
        </section>
      </div>
    );
  }

  const { payload: p, verified } = res;
  const confirmMsg = `Confirmed by ${p.e}: BoliHisab wage receipt for ${p.w} (${p.n} entries, outstanding ${inr(p.out)} as of ${p.d}).`;

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-4 px-4 py-8">
      <section data-testid="verify-receipt" className="sheet-panel card-enter relative overflow-hidden p-6 text-white">
        <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#6EE7B7]/15 blur-3xl" />
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow">BoliHisab Trust Receipt</span>
          <span
            className={`pill ${
              verified ? 'border border-emerald-400/35 bg-emerald-400/15 text-[#6EE7B7]' : 'border border-amber-400/35 bg-amber-400/15 text-[#FCD34D]'
            }`}
          >
            {verified ? '✓ Tamper-check verified' : '⚠ Altered link'}
          </span>
        </div>

        <h1 className="mt-3 text-2xl font-extrabold tracking-tight">{p.e}</h1>
        <p className="text-sm text-[#9E97B5]">
          Worker: <span className="font-bold text-white">{p.w}</span> · {p.d}
        </p>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
          <p className="eyebrow">Still owed</p>
          <p className="money-text mt-1 text-5xl font-extrabold tabular-nums">{inr(p.out)}</p>
        </div>

        <dl className="well mt-4 grid grid-cols-3 gap-2 p-3 text-center">
          <div>
            <dt className="text-[11px] font-semibold text-[#9E97B5]">Earned</dt>
            <dd className="text-base font-bold tabular-nums">{inr(p.er)}</dd>
          </div>
          <div className="border-x border-white/10">
            <dt className="text-[11px] font-semibold text-[#9E97B5]">Advances</dt>
            <dd className="text-base font-bold tabular-nums text-[#FB7185]">{inr(p.ad)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold text-[#9E97B5]">Payments</dt>
            <dd className="text-base font-bold tabular-nums text-[#5EEAD4]">{inr(p.py)}</dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="pill border border-white/10 bg-white/[0.05] text-[#D9D5E6]">📒 {p.n} logged entries</span>
          {p.vp > 0 && <span className="pill border border-[#FF7A2F]/30 bg-[#FF7A2F]/12 text-[#FFB27A]">🎙 {p.vp} voice-proof clips</span>}
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <a href={whatsappUrl(confirmMsg)} target="_blank" rel="noopener" className="btn btn-primary h-12 w-full">
            ✓ Confirm via WhatsApp
          </a>
          <button type="button" onClick={onDismiss} className="btn btn-ghost h-12 w-full">
            Open BoliHisab
          </button>
        </div>
      </section>
    </div>
  );
}

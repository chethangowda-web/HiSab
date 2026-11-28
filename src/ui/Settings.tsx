import { useEffect, useState, type ReactNode } from 'react';
import { edgeInfo } from '../nlu/llmParser';
import { wisprConfigured } from '../voice/engine';
import { LANGUAGES } from '../i18n/ui';
import { db } from '../db/db';
import { useApp } from './AppContext';
import Avatar from './Avatar';
import WisprMark from './WisprMark';
import Switch from './Switch';

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="fintech-card flex flex-col gap-3 p-4">
      <h2 className="text-lg font-extrabold text-[#F3F7EC]">{title}</h2>
      {children}
    </section>
  );
}

type EdgeStatus = 'idle' | 'checking' | 'ok' | 'sarvam' | 'down';

/** One employer's usual daily rate; saved when the field loses focus, ignored if not a valid amount. */
function RateRow({ id, name, rate }: { id: string; name: string; rate?: number }) {
  const { t, reload } = useApp();
  const [value, setValue] = useState(rate ? String(rate) : '');
  useEffect(() => setValue(rate ? String(rate) : ''), [rate]);
  const save = async () => {
    const n = Number(value.trim());
    if (value.trim() === '' || !Number.isInteger(n) || n <= 0 || n >= 100000) {
      setValue(rate ? String(rate) : '');
      return;
    }
    if (n !== rate) {
      await db.employers.update(id, { dailyRate: n });
      await reload();
    }
  };
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-[#263A1A] bg-[#0F180A] p-2.5">
      <Avatar name={name} size="h-10 w-10 text-lg" />
      <span className="min-w-[7rem] flex-1 text-lg font-bold text-[#F3F7EC]">{name}</span>
      {/* wraps to its own line on narrow screens instead of squeezing the name */}
      <span className="ml-auto flex items-center gap-2">
        <span className="text-lg font-bold text-[#9BB08B]">₹</span>
        <input
          aria-label={`${name} ${t.dailyRateAria}`}
          inputMode="numeric"
          value={value}
          onChange={(ev) => setValue(ev.target.value)}
          onBlur={() => void save()}
          onKeyDown={(ev) => ev.key === 'Enter' && (ev.target as HTMLInputElement).blur()}
          className="h-12 w-24 rounded-2xl border border-[#344E24] bg-[#16220F] px-3 text-right text-xl font-bold tabular-nums text-[#F3F7EC]"
        />
        <span className="text-sm text-[#9BB08B]">{t.perDayUnit}</span>
      </span>
    </li>
  );
}

export default function Settings() {
  const { t, lang, setLang, workerName, setWorkerName, edgeMode, setEdgeMode, employers, keepProof, setKeepProof, useWispr, setUseWispr } =
    useApp();
  const [wispr, setWispr] = useState<'checking' | 'ok' | 'missing'>('checking');
  useEffect(() => {
    let alive = true;
    void wisprConfigured().then((ok) => alive && setWispr(ok ? 'ok' : 'missing'));
    return () => {
      alive = false;
    };
  }, []);
  const [edge, setEdge] = useState<EdgeStatus>('idle');

  // When the smart helper is on, show whether Sarvam 105B or the local model can be reached.
  useEffect(() => {
    if (!edgeMode) {
      setEdge('idle');
      return;
    }
    let alive = true;
    setEdge('checking');
    void edgeInfo().then((info) => {
      if (!alive) return;
      setEdge(!info.ok ? 'down' : info.provider === 'sarvam' ? 'sarvam' : 'ok');
    });
    return () => {
      alive = false;
    };
  }, [edgeMode]);

  return (
    <div className="flex flex-col gap-4">
      <Card title={t.language}>
        <p className="text-sm text-[#9BB08B]">{t.languageHelp}</p>
        <div className="grid grid-cols-1 gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.lang}
              type="button"
              aria-pressed={lang === l.lang}
              onClick={() => setLang(l.lang)}
              className={`h-14 rounded-2xl px-6 text-xl font-bold transition ${
                lang === l.lang
                  ? 'bg-[#C9F43A] text-[#0B1307] shadow-md'
                  : 'border border-[#2A401D] bg-[#0F180A] text-[#E5F0D8] hover:border-[#496D31]'
              }`}
            >
              {lang === l.lang && <span aria-hidden="true">✓ </span>}
              {l.label}
            </button>
          ))}
        </div>
      </Card>

      <Card title={t.yourName}>
        <input
          value={workerName}
          onChange={(e) => setWorkerName(e.target.value)}
          aria-label={t.yourName}
          autoComplete="name"
          className="h-14 rounded-2xl border border-[#344E24] bg-[#0F180A] px-4 text-xl font-semibold text-[#F3F7EC] focus:border-[#C9F43A] focus:outline-none"
        />
      </Card>

      <Card title={t.voiceEngineTitle}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-lg font-bold text-[#F3F7EC]">
              <WisprMark /> Wispr Flow
            </p>
            <p role="status" className={wispr === 'ok' ? 'text-sm font-semibold text-[#C9F43A]' : 'text-sm text-[#9BB08B]'}>
              {wispr === 'checking' ? t.edgeChecking : wispr === 'ok' ? t.wisprOk : t.wisprMissing}
            </p>
          </div>
          <Switch checked={useWispr} onChange={setUseWispr} label={t.useWisprLabel} />
        </div>
      </Card>

      <Card title={t.keepProofTitle}>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-[#9BB08B]">{t.keepProofHelp}</p>
          <Switch checked={keepProof} onChange={setKeepProof} label={t.keepProofTitle} />
        </div>
      </Card>

      {employers.length > 0 && (
        <Card title={t.rateTitle}>
          <ul className="flex flex-col gap-2">
            {employers.map((e) => (
              <RateRow key={e.id} id={e.id} name={e.name} rate={e.dailyRate} />
            ))}
          </ul>
          <p className="text-sm text-[#9BB08B]">{t.ratesHelp}</p>
        </Card>
      )}

      <Card title={t.edgeLabel}>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-[#9BB08B]">{t.edgeHelp}</p>
          <Switch checked={edgeMode} onChange={setEdgeMode} label={t.edgeLabel} />
        </div>
        {edge !== 'idle' && (
          <p
            role="status"
            className={`rounded-2xl px-3.5 py-2.5 text-sm font-semibold ${
              edge === 'ok' || edge === 'sarvam'
                ? 'border border-[#3D5E29] bg-[#1B2D12] text-[#D9F76E]'
                : edge === 'down'
                  ? 'border border-amber-500/40 bg-amber-950/60 text-amber-200'
                  : 'bg-[#0F180A] text-[#B8C9AA]'
            }`}
          >
            {edge === 'checking' ? t.edgeChecking : edge === 'sarvam' ? t.edgeSarvamOk : edge === 'ok' ? t.edgeOk : t.edgeDown}
          </p>
        )}
      </Card>
    </div>
  );
}

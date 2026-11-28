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
    <section className="card flex flex-col gap-3 p-4">
      <h2 className="text-lg font-extrabold text-[#1C1917]">{title}</h2>
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
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 well p-2.5">
      <Avatar name={name} size="h-10 w-10 text-lg" />
      <span className="min-w-[7rem] flex-1 text-lg font-bold text-[#1C1917]">{name}</span>
      {/* wraps to its own line on narrow screens instead of squeezing the name */}
      <span className="ml-auto flex items-center gap-2">
        <span className="text-lg font-bold text-[#6B6259]">₹</span>
        <input
          aria-label={`${name} ${t.dailyRateAria}`}
          inputMode="numeric"
          value={value}
          onChange={(ev) => setValue(ev.target.value)}
          onBlur={() => void save()}
          onKeyDown={(ev) => ev.key === 'Enter' && (ev.target as HTMLInputElement).blur()}
          className="input w-24 text-right text-xl font-bold tabular-nums"
        />
        <span className="text-sm text-[#6B6259]">{t.perDayUnit}</span>
      </span>
    </li>
  );
}

export default function Settings() {
  const { t, lang, setLang, workerName, setWorkerName, workerPhone, setWorkerPhone, edgeMode, setEdgeMode, employers, keepProof, setKeepProof, useWispr, setUseWispr } =
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
        <p className="text-sm text-[#6B6259]">{t.languageHelp}</p>
        <div className="grid grid-cols-1 gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.lang}
              type="button"
              aria-pressed={lang === l.lang}
              onClick={() => setLang(l.lang)}
              className={`btn h-14 rounded-2xl px-6 text-xl ${
                lang === l.lang ? 'btn-primary' : 'btn-ghost'
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
          className="input h-14 text-xl font-semibold"
        />
      </Card>

      <Card title={t.yourPhone}>
        <input
          value={workerPhone}
          onChange={(e) => setWorkerPhone(e.target.value)}
          aria-label={t.yourPhone}
          inputMode="tel"
          autoComplete="tel"
          className="input h-14 text-xl font-semibold"
        />
      </Card>

      <Card title={t.voiceEngineTitle}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-lg font-bold text-[#1C1917]">
              <WisprMark /> Wispr Flow
            </p>
            <p role="status" className={wispr === 'ok' ? 'text-sm font-semibold text-[#166534]' : 'text-sm text-[#6B6259]'}>
              {wispr === 'checking' ? t.edgeChecking : wispr === 'ok' ? t.wisprOk : t.wisprMissing}
            </p>
          </div>
          <Switch checked={useWispr} onChange={setUseWispr} label={t.useWisprLabel} />
        </div>
      </Card>

      <Card title={t.keepProofTitle}>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-[#6B6259]">{t.keepProofHelp}</p>
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
          <p className="text-sm text-[#6B6259]">{t.ratesHelp}</p>
        </Card>
      )}

      <Card title={t.edgeLabel}>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-[#6B6259]">{t.edgeHelp}</p>
          <Switch checked={edgeMode} onChange={setEdgeMode} label={t.edgeLabel} />
        </div>
        {edge !== 'idle' && (
          <p
            role="status"
            className={`rounded-2xl px-3.5 py-2.5 text-sm font-semibold ${
              edge === 'ok' || edge === 'sarvam'
                ? 'border border-[#BFE3C8] bg-[#E6F4EA] text-[#166534]'
                : edge === 'down'
                  ? 'border border-[#F2D08A] bg-[#FEF3C7] text-[#92400E]'
                  : 'bg-[#F3ECDD] text-[#6B6259]'
            }`}
          >
            {edge === 'checking' ? t.edgeChecking : edge === 'sarvam' ? t.edgeSarvamOk : edge === 'ok' ? t.edgeOk : t.edgeDown}
          </p>
        )}
      </Card>
    </div>
  );
}

import { useEffect, useState, type ReactNode } from 'react';
import { checkEdge } from '../nlu/llmParser';
import { wisprConfigured } from '../voice/engine';
import { LANGUAGES } from '../i18n/ui';
import { db } from '../db/db';
import { useApp } from './AppContext';
import Avatar from './Avatar';
import WisprMark from './WisprMark';
import Switch from './Switch';

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

type EdgeStatus = 'idle' | 'checking' | 'ok' | 'down';

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
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Avatar name={name} size="h-10 w-10 text-lg" />
      <span className="min-w-[7rem] flex-1 text-lg font-semibold">{name}</span>
      {/* wraps to its own line on narrow screens instead of squeezing the name */}
      <span className="ml-auto flex items-center gap-2">
      <span className="text-lg text-slate-500">₹</span>
      <input
        aria-label={`${name} ${t.dailyRateAria}`}
        inputMode="numeric"
        value={value}
        onChange={(ev) => setValue(ev.target.value)}
        onBlur={() => void save()}
        onKeyDown={(ev) => ev.key === 'Enter' && (ev.target as HTMLInputElement).blur()}
        className="h-12 w-24 rounded-xl border border-slate-300 px-3 text-right text-xl"
      />
      <span className="text-slate-500">{t.perDayUnit}</span>
      </span>
    </li>
  );
}

export default function Settings() {
  const { t, lang, setLang, demoMode, setDemoMode, workerName, setWorkerName, edgeMode, setEdgeMode, employers, keepProof, setKeepProof, useWispr, setUseWispr } =
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

  // When the smart helper is on, show whether the local model can actually be reached.
  useEffect(() => {
    if (!edgeMode) {
      setEdge('idle');
      return;
    }
    let alive = true;
    setEdge('checking');
    void checkEdge().then((ok) => alive && setEdge(ok ? 'ok' : 'down'));
    return () => {
      alive = false;
    };
  }, [edgeMode]);

  return (
    <div className="flex flex-col gap-4">
      <Card title={t.language}>
        <p className="text-slate-600">{t.languageHelp}</p>
        <div className="grid grid-cols-1 gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.lang}
              type="button"
              aria-pressed={lang === l.lang}
              onClick={() => setLang(l.lang)}
              className={`h-14 rounded-xl px-6 text-xl font-semibold transition-colors ${
                lang === l.lang ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-900 active:bg-slate-200'
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
          className="h-14 rounded-xl border border-slate-300 px-4 text-xl"
        />
      </Card>

      <Card title={t.voiceEngineTitle}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-lg font-bold">
              <WisprMark /> Wispr Flow
            </p>
            <p role="status" className={wispr === 'ok' ? 'text-teal-800' : 'text-slate-600'}>
              {wispr === 'checking' ? t.edgeChecking : wispr === 'ok' ? t.wisprOk : t.wisprMissing}
            </p>
          </div>
          <Switch checked={useWispr} onChange={setUseWispr} label={t.useWisprLabel} />
        </div>
      </Card>

      <Card title={t.keepProofTitle}>
        <div className="flex items-center justify-between gap-4">
          <p className="text-slate-600">{t.keepProofHelp}</p>
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
          <p className="text-slate-600">{t.ratesHelp}</p>
        </Card>
      )}

      <Card title={t.demoModeLabel}>
        <div className="flex items-center justify-between gap-4">
          <p className="text-slate-600">{t.demoHelp}</p>
          <Switch checked={demoMode} onChange={(on) => void setDemoMode(on)} label={t.demoModeLabel} onColor="bg-amber-600" />
        </div>
      </Card>

      <Card title={t.edgeLabel}>
        <div className="flex items-center justify-between gap-4">
          <p className="text-slate-600">{t.edgeHelp}</p>
          <Switch checked={edgeMode} onChange={setEdgeMode} label={t.edgeLabel} />
        </div>
        {edge !== 'idle' && (
          <p
            role="status"
            className={`rounded-xl px-3 py-2 ${
              edge === 'ok' ? 'bg-teal-50 text-teal-900' : edge === 'down' ? 'bg-amber-50 text-amber-900' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {edge === 'checking' ? t.edgeChecking : edge === 'ok' ? t.edgeOk : t.edgeDown}
          </p>
        )}
      </Card>
    </div>
  );
}

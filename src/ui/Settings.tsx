import { useEffect, useState, type ReactNode } from 'react';
import { edgeInfo } from '../nlu/llmParser';
import { buildExportBackup } from '../domain/receipt';
import { localISODate } from '../domain/dates';
import { wisprConfigured } from '../voice/engine';
import { LANGUAGES } from '../i18n/ui';
import { db, deleteEmployer } from '../db/db';
import { seedSampleLedger } from '../db/seed';
import { useApp } from './AppContext';
import Avatar from './Avatar';
import WisprMark from './WisprMark';
import Switch from './Switch';

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card flex flex-col gap-3 p-4">
      <h2 className="text-lg font-extrabold text-[#F5F3FA]">{title}</h2>
      {children}
    </section>
  );
}

type EdgeStatus = 'idle' | 'checking' | 'ok' | 'sarvam' | 'down';

/** One employer's usual daily rate; saved when the field loses focus, plus quick delete for accidental names. */
function RateRow({ id, name, rate }: { id: string; name: string; rate?: number }) {
  const { t, reload } = useApp();
  const [value, setValue] = useState(rate ? String(rate) : '');
  const [confirmDelete, setConfirmDelete] = useState(false);
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
    <li className="flex flex-wrap items-center gap-x-2.5 gap-y-2 well p-2.5">
      <Avatar name={name} size="h-10 w-10 text-lg" />
      <span className="min-w-[6rem] flex-1 text-lg font-bold text-[#F5F3FA]">{name}</span>
      {/* wraps to its own line on narrow screens instead of squeezing the name */}
      <span className="ml-auto flex items-center gap-1.5">
        <span className="text-lg font-bold text-[#ABA5BD]">₹</span>
        <input
          aria-label={`${name} ${t.dailyRateAria}`}
          inputMode="numeric"
          value={value}
          onChange={(ev) => setValue(ev.target.value)}
          onBlur={() => void save()}
          onKeyDown={(ev) => ev.key === 'Enter' && (ev.target as HTMLInputElement).blur()}
          className="input w-24 text-right text-xl font-bold tabular-nums"
        />
        <span className="text-sm text-[#ABA5BD]">{t.perDayUnit}</span>
        {confirmDelete ? (
          <button
            type="button"
            aria-label={`Confirm delete ${name}`}
            onClick={() => void deleteEmployer(id).then(reload)}
            className="btn btn-danger h-10 px-3 text-xs"
          >
            {t.delete}
          </button>
        ) : (
          <button
            type="button"
            aria-label={`Delete ${name}`}
            onClick={() => setConfirmDelete(true)}
            className="glass-circle h-10 w-10 text-sm text-[#ABA5BD] hover:text-[#FB7185]"
          >
            ✕
          </button>
        )}
      </span>
    </li>
  );
}

export default function Settings() {
  const { t, lang, setLang, workerName, setWorkerName, workerPhone, setWorkerPhone, edgeMode, setEdgeMode, employers, entries, reload, keepProof, setKeepProof, useWispr, setUseWispr } =
    useApp();
  const [wispr, setWispr] = useState<'checking' | 'ok' | 'missing'>('checking');
  const [sarvamVoice, setSarvamVoice] = useState<'checking' | 'ok' | 'missing'>('checking');
  const [sampleLoaded, setSampleLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    void wisprConfigured().then((ok) => alive && setWispr(ok ? 'ok' : 'missing'));
    void fetch('/api/voice-health')
      .then((r) => (r.ok ? (r.json() as Promise<{ sarvamStt?: boolean }>) : null))
      .then((d) => alive && setSarvamVoice(d?.sarvamStt ? 'ok' : 'missing'))
      .catch(() => alive && setSarvamVoice('missing'));
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
        <p className="text-sm text-[#ABA5BD]">{t.languageHelp}</p>
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
        <div className="well flex items-center justify-between gap-3 p-3">
          <div>
            <p className="text-sm font-extrabold text-white">✨ Sarvam AI Voice (STT + TTS)</p>
            <p className={sarvamVoice === 'ok' ? 'text-xs font-semibold text-[#6EE7A8]' : 'text-xs text-[#9E97B5]'}>
              {sarvamVoice === 'checking'
                ? t.edgeChecking
                : sarvamVoice === 'ok'
                  ? 'Active · saaras:v4 Indian speech + neural voice replies'
                  : 'Phone speech recognition active'}
            </p>
          </div>
          {sarvamVoice === 'ok' && <span className="pill border border-emerald-400/35 bg-emerald-400/15 text-[#6EE7A8]">Active</span>}
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-lg font-bold text-[#F5F3FA]">
              <WisprMark /> Wispr Flow
            </p>
            <p role="status" className={wispr === 'ok' ? 'text-sm font-semibold text-[#6EE7A8]' : 'text-sm text-[#ABA5BD]'}>
              {wispr === 'checking' ? t.edgeChecking : wispr === 'ok' ? t.wisprOk : t.wisprMissing}
            </p>
          </div>
          <Switch checked={useWispr} onChange={setUseWispr} label={t.useWisprLabel} />
        </div>
      </Card>

      <Card title={t.keepProofTitle}>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-[#ABA5BD]">{t.keepProofHelp}</p>
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
          <p className="text-sm text-[#ABA5BD]">{t.ratesHelp}</p>
        </Card>
      )}

      <Card title={t.edgeLabel}>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-[#ABA5BD]">{t.edgeHelp}</p>
          <Switch checked={edgeMode} onChange={setEdgeMode} label={t.edgeLabel} />
        </div>
        {edge !== 'idle' && (
          <p
            role="status"
            className={`rounded-2xl px-3.5 py-2.5 text-sm font-semibold ${
              edge === 'ok' || edge === 'sarvam'
                ? 'border border-emerald-300/30 bg-emerald-400/12 text-[#6EE7A8]'
                : edge === 'down'
                  ? 'border border-amber-300/30 bg-amber-300/12 text-[#FCD34D]'
                  : 'bg-white/[0.06] text-[#ABA5BD]'
            }`}
          >
            {edge === 'checking' ? t.edgeChecking : edge === 'sarvam' ? t.edgeSarvamOk : edge === 'ok' ? t.edgeOk : t.edgeDown}
          </p>
        )}
      </Card>

      <Card title="Khata backup & sample week">
        <p className="text-sm text-[#ABA5BD]">Download a backup of your entries anytime, or populate a sample week to test all reports.</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const json = buildExportBackup(entries, employers, workerName);
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `bolihisab-${localISODate()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="btn btn-ghost flex-1 text-sm"
          >
            ⬇ Export JSON ({entries.length})
          </button>
          <button
            type="button"
            onClick={() => {
              void seedSampleLedger().then(async () => {
                await reload();
                setSampleLoaded(true);
              });
            }}
            className="btn btn-primary flex-1 text-sm"
          >
            {sampleLoaded ? '✓ Sample loaded' : '▶ Load sample week'}
          </button>
        </div>
      </Card>
    </div>
  );
}

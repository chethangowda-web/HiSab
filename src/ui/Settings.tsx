import { useEffect, useState, type ReactNode } from 'react';
import { checkEdge } from '../nlu/llmParser';
import { LANGUAGES } from '../i18n/ui';
import { useApp } from './AppContext';
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

export default function Settings() {
  const { t, lang, setLang, demoMode, setDemoMode, workerName, setWorkerName, edgeMode, setEdgeMode } = useApp();
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

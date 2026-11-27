import { LANGUAGES } from '../i18n/ui';
import { useApp } from './AppContext';

export default function Settings() {
  const { t, lang, setLang, demoMode, setDemoMode, workerName, setWorkerName } = useApp();
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold">{t.language}</h2>
        <p className="text-slate-600">{t.languageHelp}</p>
        {LANGUAGES.map((l) => (
          <button
            key={l.lang}
            type="button"
            aria-pressed={lang === l.lang}
            onClick={() => setLang(l.lang)}
            className={`h-14 rounded-xl px-6 text-xl font-semibold ${
              lang === l.lang ? 'bg-teal-700 text-white' : 'bg-white text-slate-900 shadow'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-2xl font-semibold">{t.yourName}</span>
        <input
          value={workerName}
          onChange={(e) => setWorkerName(e.target.value)}
          className="h-14 rounded-xl border border-slate-300 px-4 text-xl"
        />
      </label>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-semibold">{t.demoModeLabel}</span>
          <button
            type="button"
            role="switch"
            aria-checked={demoMode}
            aria-label={t.demoModeLabel}
            onClick={() => void setDemoMode(!demoMode)}
            className={`h-10 w-20 rounded-full p-1 transition ${demoMode ? 'bg-amber-600' : 'bg-slate-300'}`}
          >
            <span className={`block h-8 w-8 rounded-full bg-white shadow transition ${demoMode ? 'translate-x-10' : ''}`} />
          </button>
        </div>
        <p className="text-slate-600">{t.demoHelp}</p>
      </div>
    </section>
  );
}

import { LANGUAGES } from '../i18n/ui';
import { useApp } from './AppContext';

export default function Settings() {
  const { t, lang, setLang } = useApp();
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-2xl font-semibold">{t.language}</h2>
      <p className="text-slate-600">{t.languageHelp}</p>
      <div className="flex flex-col gap-3">
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
    </section>
  );
}

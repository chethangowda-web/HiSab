# BoliHisab – Technical Requirements (TRD)

## 1. Stack
- React 18 + TypeScript + Vite, PWA (manifest + service worker)
- Tailwind CSS (large touch targets)
- Dexie (IndexedDB)
- jsPDF + jspdf-autotable
- Web Speech API: `SpeechRecognition`, `speechSynthesis`
- Vitest for unit tests
- Optional: Node (Express) proxy `server/` for LLM parsing

## 2. Repo layout
```
src/
  voice/        speechInput.ts speechOutput.ts dialogue.ts
  nlu/          normalize.ts ruleParser.ts llmParser.ts validate.ts lexicon.ts
  domain/       types.ts ledger.ts queries.ts statement.ts
  db/           db.ts seed.ts
  ui/           Home Voice Ledger Employers Payments Settings components
  i18n/         en.json hi.json kn.json
server/         index.ts (optional)
tests/          parser.test.ts ledger.test.ts dialogue.test.ts
docs/
```

## 3. Types
```ts
type Lang = 'en-IN' | 'hi-IN' | 'kn-IN';
type EntryType = 'work' | 'overtime' | 'advance' | 'payment';
interface Entry {
  id: string; employerId: string; type: EntryType;
  amount: number;            // integer INR
  hours?: number; date: string; // ISO yyyy-mm-dd
  source: 'worker' | 'employer_confirmed';
  rawTranscript: string; lang: Lang; createdAt: number;
}
interface Employer { id: string; name: string; dailyRate?: number; overtimeRate?: number }
type Intent =
  | { kind: 'record'; draft: Partial<Entry> & { employerName?: string } }
  | { kind: 'query'; q: 'owed' | 'earned' | 'advances' | 'days'; employerName?: string; period?: 'month' | 'all' }
  | { kind: 'confirm' | 'deny' | 'repeat' | 'unknown' };
```

## 4. Speech
- STT: `webkitSpeechRecognition`, `lang` from settings, `interimResults=false`, read `confidence` of the top alternative.
- Confidence under 0.6, or an empty transcript, sends the user to a "please repeat" prompt (max 2 retries, then tap-input fallback).
- TTS: `speechSynthesis` with a voice matching the language; fall back to `en-IN` if the language voice is missing, and show text on screen as well.
- Feature-detect on load. If STT is unsupported, switch to typed input and show a banner. Demo mode stays available.

## 5. NLU
**Normalizer:** Devanagari/Kannada digits → ASCII; number words ("saat sau", "ಏಳುನೂರು", "seven hundred", "ek hazaar") → integers; relative dates ("aaj", "kal", "ಇಂದು", "ನಿನ್ನೆ", "today", "yesterday") → ISO date.

**RuleParser:** lexicon-driven.
- Intent verbs: kaam/ಕೆಲಸ/worked → work; extra/overtime/ಹೆಚ್ಚುವರಿ → overtime; advance/ಮುಂಗಡ/peshgi → advance; diya/mila/paid/ಕೊಟ್ಟ → payment (direction decides received vs advance).
- Query words: kitna/ಎಷ್ಟು/how much + dena/baaki/owe/pending/ಬಾಕಿ.
- Employer name: token before `ke site|ka|ne|at|ಅವರ` or matched against known employers (fuzzy, Levenshtein ≤ 2).
- Returns missing fields list.

**LLMParser (optional):** POST `/api/parse` with `{transcript, lang, knownEmployers, today}`; the LLM returns JSON validated against the same schema. It is used only when `LLM_API_KEY` is set on the server. On any failure, fall back to RuleParser.

**Validator (hard rules):** amount must be a positive integer under 100000; a date in the future is rejected; a record with no amount is never saved; hours between 0 and 24.

## 6. Dialogue manager (state machine)
States: `IDLE → LISTENING → PARSING → (CLARIFY ↔ LISTENING) → CONFIRM → SAVED → IDLE`.
- CLARIFY asks for one missing field at a time, in the user's language.
- CONFIRM speaks the read-back; accepts yes/no words in all three languages plus on-screen Yes/No buttons; a correction ("nahi, 800") re-parses the amount and re-confirms.
- Never transitions to SAVED without an explicit confirm.

## 7. Ledger engine (pure functions, unit tested)
- `balance(employer) = Σ(work + overtime) − Σ(advance + payment)`
- Overtime amount = `hours × overtimeRate` when only hours are stated; else the stated amount.
- `daysWorked` = distinct dates with `work` entries.
- `earnedThisMonth` filters by the current calendar month.
- All money in integer rupees.

## 8. PDF statement
Header (worker name, employer, period), a table of dated entries with source badge, totals (earned, advances, payments, **outstanding**), footer "Worker-recorded unless marked Employer-confirmed". Shared through `navigator.share` with a download fallback.

## 9. Employer confirmation (P1, minimal)
Each entry can be marked confirmed from the worker's phone with an employer "Confirm" tap, which flips `source` to `employer_confirmed`. No separate employer account.

## 10. Demo mode
Settings toggle, with an always-visible "DEMO MODE" badge. It uses seed data and a "Play sample utterance" button that feeds canned transcripts through the real parser, dialogue and ledger code.

## 11. Non-functional
- Runs with `npm install && npm run dev`, no `.env` needed.
- Works offline after the first load.
- Voice round trip under 3 s on a mid-range Android phone (excluding speaking time).
- Minimum touch target is 56px, and the mic button is at least 96px.
- Accessible: high contrast, spoken and visual feedback for every state.

## 12. Testing
- Unit: normalizer (number words/dates), parser (at least 30 utterances across the 3 languages), ledger math, validator.
- Dialogue tests: missing amount triggers a clarify, no save without confirm, low confidence triggers repeat.
- Manual: Chrome Android, Chrome desktop, noisy-room check.

## 13. Build order (3 days)
1. Day 1: scaffold, types, DB, ledger and queries, normalizer and rule parser with tests.
2. Day 2: speech in/out, dialogue manager, voice screen, dashboard and ledger UI.
3. Day 3: PDF, demo mode, polish, README, record demo, pitch deck, submit.

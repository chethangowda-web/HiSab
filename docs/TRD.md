# BoliHisab – Technical Requirements (TRD)

## 1. Stack
- React 18 + TypeScript + Vite, installable web app (manifest; no service worker yet)
- Tailwind CSS (large touch targets)
- Dexie (IndexedDB)
- Wage statement: an HTML page with print styles, saved as PDF through the browser's print dialog (no PDF library; see section 8)
- Web Speech API: `SpeechRecognition`, `speechSynthesis`
- Vitest for unit tests
- Optional "edge mode": local open-source LLM (primary `google/gemma-4-E2B`, backup `Qwen2.5-3B-Instruct`, 4-bit quantized) served via Ollama/llama.cpp, called through a small Node proxy `server/`. No paid or closed API, so no keys and no per-call cost.

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
- STT, phase 1 (ship first): `webkitSpeechRecognition`, which is not offline (Chrome sends audio to Google). Phase 2 (edge mode, if time allows): open models, `AI4Bharat IndicConformer` first and `Whisper small` as a fallback, run locally behind the same `SpeechInput` interface so the swap is a config change.
- Browser STT settings: `lang` from settings, `interimResults=false`, read `confidence` of the top alternative.
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

**LLMParser (optional, edge mode):** POST `/api/parse` with `{transcript, lang, knownEmployers, today}` to a locally hosted open model. Used only when the local model server is reachable. On any failure, fall back to RuleParser.

**Model choice (open-source, edge-deployable, no per-call cost):**
| Role | Model | Notes |
|---|---|---|
| Primary | `google/gemma-4-E2B` | ~2B effective params, cheap to run, expected better Indic coverage |
| Backup | `Qwen2.5-3B-Instruct` | Heavier, but more reliable than the 1.5B |
| Rejected | `Qwen2.5-1.5B-Instruct` | Hallucinated heavily in our tests |
| Rejected | `Qwen2.5-7B-Instruct` | Too heavy for edge devices |

The final choice is made by a benchmark: the same ~30 utterances (Kannada, Hindi, English, mixed) through Gemma E2B and Qwen 3B, scored on amount accuracy and invented fields. Keep the winner.

**Anti-hallucination rules (apply to any model):**
1. Temperature 0 and output constrained to the JSON schema.
2. The parsed amount, or its number word, **must appear in the transcript**. If not, reject the parse and ask the user to repeat.
3. The LLM only extracts fields. Ledger maths stays in code.
4. Read-back and confirmation stay mandatory.

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
Header (worker name, employer, date), a table of dated entries with source label, totals (earned, advances, payments, **outstanding**), footer "Worker-recorded unless marked Employer-confirmed".

**Why print-to-PDF and not a PDF library:** libraries like jsPDF have no complex-script shaping, so Kannada and Hindi vowel signs and conjuncts come out wrong, and Kannada employer names are exactly what workers will have. The statement is a normal page with `@media print` rules (only the statement prints); "Save as PDF" calls `window.print()` and the browser shapes the text and embeds a proper font (checked in real Chrome: valid PDF with NirmalaUI embedded).

**Sharing:** "Share summary" sends a plain-text summary through `navigator.share`, falling back to a WhatsApp link (`wa.me`). Text works in any script.

**Edit / delete:** amount and date can be edited (same bounds as spoken entries); deleting asks first. Editing an employer-confirmed entry voids the confirmation, so it returns to worker-recorded.

**Demo mode:** sample rows are flagged `demo` and shown instead of real rows; turning it off deletes only the flagged rows. The content is hidden while switching so nothing can be saved halfway.

## 9. Employer confirmation (P1, minimal)
Each entry can be marked confirmed from the worker's phone with an employer "Confirm" tap, which flips `source` to `employer_confirmed`. No separate employer account.

## 10. Demo mode
Settings toggle, with an always-visible "DEMO MODE" badge. It uses seed data and a "Play sample utterance" button that feeds canned transcripts through the real parser, dialogue and ledger code.

## 11. Non-functional
- Runs with `npm install && npm run dev`, no `.env` needed.
- Records are stored on the device (IndexedDB) and survive reloads. The app itself needs a network connection to load: an offline service worker is not built yet. Browser speech recognition also needs a connection (Chrome sends audio to Google); typing and all ledger features work without voice.
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

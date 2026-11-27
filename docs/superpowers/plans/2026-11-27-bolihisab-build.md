# BoliHisab Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A voice-first wage tracker PWA where a worker speaks a work/payment entry, hears a read-back, confirms, and can ask balances by voice.

**Architecture:** Pure domain/NLU modules (unit tested) under a thin React UI. A rule-based parser is the default; speech uses browser APIs first. A local open LLM is an optional "edge mode" behind a Node proxy.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind, Dexie, jsPDF, Vitest, Web Speech API.

**Spec:** `docs/PRD.md`, `docs/TRD.md`, `docs/ARCHITECTURE.md`, `docs/RULES.md`

## Global Constraints

- Runs with `npm install && npm run dev`, no `.env`, no keys.
- Money is integer rupees; no floats anywhere in ledger code.
- Never save without read-back and explicit confirm.
- Amount (or its number word) must appear in the transcript, else reject the parse.
- Languages: `en-IN`, `hi-IN`, `kn-IN`. Mic >= 96px, touch targets >= 56px, font >= 18px.
- Demo mode always labelled "DEMO MODE".
- LLM only open-source and local; every LLM call has a rule-parser fallback.
- Test after each phase: `npm test` and `npm run build` must pass before the next phase starts.

## Review Focus

- Kannada/Devanagari digits ("೭೦೦", "७००") must parse as 700.
- "1,000", "₹1000" and "one thousand" all give 1000.
- Advance with no employer named: dialogue asks "which employer?", never defaults one.
- Future date or amount of 0 or >= 100000: rejected, never confirmed.
- Two employers with the same first name: ask which one, don't merge.
- Mic denied or speech API unsupported: typed-input fallback appears, no crash.

---

## Phase 0: Setup

### Task 0: Scaffold project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `tailwind.config.js`, `postcss.config.js`, `src/index.css`, `.env.example`, `tests/smoke.test.ts`
- Modify: `README.md`

**Interfaces:**
- Produces: scripts `dev`, `build`, `test` (vitest run); `src/App.tsx` default export `App` rendering text "BoliHisab".

- [ ] **Step 1: Write failing test** `tests/smoke.test.ts`: `expect(1 + 1).toBe(2)` (proves vitest wiring), and a render test that `<App />` contains text `BoliHisab` (uses `@testing-library/react`, jsdom).
- [ ] **Step 2: Run** `npm test` Expected: FAIL (no project/App yet).
- [ ] **Step 3: Scaffold** Vite React-TS in the repo root (keep `docs/`, `README.md`, `.gitignore`); add tailwind, dexie, jspdf, jspdf-autotable, vitest, jsdom, @testing-library/react; `App` renders a heading "BoliHisab".
- [ ] **Step 4: Run** `npm test && npm run build` Expected: PASS, build succeeds.
- [ ] **Step 5: Commit** `chore: scaffold BoliHisab app`

**Phase 0 gate:** `npm test` green, `npm run build` green, `npm run dev` serves the page.

---

## Phase 1: Domain core

### Task 1: Types and ledger engine

**Files:**
- Create: `src/domain/types.ts`, `src/domain/ledger.ts`, `tests/ledger.test.ts`

**Interfaces:**
- Produces (`types.ts`): `Lang`, `EntryType`, `Entry`, `Employer`, `Intent` exactly as in TRD section 3.
- Produces (`ledger.ts`):
  - `balance(entries: Entry[], employerId: string): number` = sum(work+overtime) - sum(advance+payment)
  - `daysWorked(entries: Entry[], employerId: string): number` = distinct dates of `work`
  - `earned(entries: Entry[], opts: { employerId?: string; month?: string }): number` (`month` = `'YYYY-MM'`; counts work+overtime)
  - `totals(entries: Entry[], employerId: string): { earned: number; advances: number; payments: number; outstanding: number }`
  - `overtimeAmount(hours: number, ratePerHour: number): number` (rounded to integer)

- [ ] **Step 1: Failing tests** in `tests/ledger.test.ts`: entries work 700 (2026-11-25), work 700 (2026-11-26), advance 1000, payment 200 for `r1` → `balance === 200`, `daysWorked === 2`, `totals.advances === 1000`; a second employer's entries do not affect `r1`; `earned(..., {month:'2026-11'}) === 1400` and `{month:'2026-10'} === 0`; `overtimeAmount(2, 75) === 150`, `overtimeAmount(1.5, 75) === 113`.
- [ ] **Step 2: Run** `npx vitest run tests/ledger.test.ts` Expected: FAIL.
- [ ] **Step 3: Implement** the signatures above in pure TS.
- [ ] **Step 4: Run** same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat: ledger engine`

### Task 2: Query engine and database

**Files:**
- Create: `src/domain/queries.ts`, `src/db/db.ts`, `src/db/seed.ts`, `tests/queries.test.ts`

**Interfaces:**
- Consumes: `ledger.ts`.
- Produces:
  - `answerQuery(q: Extract<Intent,{kind:'query'}>, entries: Entry[], employers: Employer[], today: string): { key: 'owed'|'earned'|'advances'|'days'|'unknown_employer'|'ambiguous_employer'; amount?: number; employerName?: string }`
  - `db.ts`: Dexie `db` with tables `entries`, `employers`, `settings`; `addEntry(e: Entry): Promise<void>`, `listEntries(): Promise<Entry[]>`, `findOrCreateEmployer(name: string): Promise<Employer>`.
  - `seed.ts`: `seedDemoData(): Promise<void>` (Ramesh with 3 work days, 1 advance).

- [ ] **Step 1: Failing tests:** `answerQuery({kind:'query',q:'owed',employerName:'Ramesh'}, ...)` → `{key:'owed', amount: 200}`; unknown name → `unknown_employer`; two employers "Ramesh Kumar" and "Ramesh Gowda" with name "Ramesh" → `ambiguous_employer`; `earned` with `period:'month'` filters by `today`'s month. DB test with `fake-indexeddb`: `addEntry` then `listEntries` returns it.
- [ ] **Step 2: Run** `npx vitest run tests/queries.test.ts` Expected: FAIL.
- [ ] **Step 3: Implement.** Employer name match is case-insensitive prefix/exact; multiple matches means `ambiguous_employer`.
- [ ] **Step 4: Run** Expected: PASS.
- [ ] **Step 5: Commit** `feat: query engine and db`

**Phase 1 gate:** `npm test` green, `npm run build` green.

---

## Phase 2: Understanding speech text

### Task 3: Normalizer

**Files:**
- Create: `src/nlu/lexicon.ts`, `src/nlu/normalize.ts`, `tests/normalize.test.ts`

**Interfaces:**
- Produces:
  - `parseNumber(text: string): number | null` (first money amount found)
  - `resolveDate(text: string, today: string): string | null` (ISO date; handles aaj/today/ಇಂದು, kal/yesterday/ನಿನ್ನೆ)
  - `normalizeDigits(text: string): string` (Devanagari/Kannada digits to ASCII)

- [ ] **Step 1: Failing tests:** `parseNumber` of `"seven hundred"`, `"saat sau"`, `"ಏಳುನೂರು"`, `"೭೦೦"`, `"७००"`, `"₹700"` → 700; `"1,000"`, `"ek hazaar"`, `"one thousand"` → 1000; `"two extra hours"` → `null` (hours are not money); `resolveDate("kal","2026-11-27") === "2026-11-26"`, `resolveDate("aaj",...) === "2026-11-27"`.
- [ ] **Step 2: Run** `npx vitest run tests/normalize.test.ts` Expected: FAIL.
- [ ] **Step 3: Implement** with lexicon maps for number words in en/hi/kn; compose multipliers (sau=100, hazaar=1000).
- [ ] **Step 4: Run** Expected: PASS.
- [ ] **Step 5: Commit** `feat: number and date normalizer`

### Task 4: Rule parser and validator

**Files:**
- Create: `src/nlu/ruleParser.ts`, `src/nlu/validate.ts`, `tests/ruleParser.test.ts`, `tests/validate.test.ts`

**Interfaces:**
- Consumes: `parseNumber`, `resolveDate`.
- Produces:
  - `parseUtterance(text: string, ctx: { today: string; employers: string[]; lang: Lang }): Intent`
  - `validateDraft(draft: Partial<Entry>, transcript: string, today: string): { ok: true } | { ok: false; reason: 'no_amount'|'amount_not_in_transcript'|'bad_amount'|'future_date'|'bad_hours' }`
  - `missingFields(draft: Partial<Entry> & { employerName?: string }): ('employer'|'amount'|'type')[]`

- [ ] **Step 1: Failing tests:** table of at least 30 utterances (10 en, 10 hi/Hinglish, 10 kn/mixed) with expected `kind`, `type`, `employerName`, `amount`. Must include: `"I worked at Ramesh's construction site today for 700 rupees"` → work/Ramesh/700/today; `"Aaj Ramesh ke site pe 700 rupaye kaam kiya"` → same; `"The contractor gave me 1000 rupees advance"` → advance/1000 and `missingFields` contains `'employer'`; `"I worked two extra hours yesterday"` → overtime, hours 2, date yesterday; `"How much does Ramesh still owe me?"` → query/owed/Ramesh; `"How much have I earned this month?"` → query/earned/month; `"haan"`, `"yes"`, `"ಹೌದು"` → confirm; `"nahi"`, `"no"`, `"ಇಲ್ಲ"` → deny. Validator: amount 0 → `bad_amount`; 100000 → `bad_amount`; future date → `future_date`; amount 800 with transcript "I worked for 700" → `amount_not_in_transcript`; record with no amount → `no_amount`.
- [ ] **Step 2: Run** `npx vitest run tests/ruleParser.test.ts tests/validate.test.ts` Expected: FAIL.
- [ ] **Step 3: Implement** lexicon-driven parser per TRD section 5; fuzzy employer match (Levenshtein <= 2) against `ctx.employers`.
- [ ] **Step 4: Run** Expected: PASS, at least 90% of the table (all of the named cases pass).
- [ ] **Step 5: Commit** `feat: rule parser and validator`

**Phase 2 gate:** `npm test` green, `npm run build` green.

---

## Phase 3: Voice and dialogue

### Task 5: Dialogue state machine

**Files:**
- Create: `src/voice/dialogue.ts`, `src/i18n/messages.ts`, `tests/dialogue.test.ts`

**Interfaces:**
- Consumes: `parseUtterance`, `validateDraft`, `missingFields`, `answerQuery`.
- Produces:
  - `type DialogueState = { phase: 'IDLE'|'CLARIFY'|'CONFIRM'|'SAVED'; draft?: ...; retries: number }`
  - `type DialogueEvent = { type: 'heard'; text: string; confidence: number } | { type: 'tap_yes' } | { type: 'tap_no' } | { type: 'reset' }`
  - `step(state: DialogueState, ev: DialogueEvent, ctx: DialogueCtx): { state: DialogueState; speak?: string; save?: Entry }`
  - `messages(lang: Lang).readBack(draft) / .clarify(field) / .repeat / .saved`

- [ ] **Step 1: Failing tests:** confidence 0.4 → `speak` is the repeat prompt, state unchanged, no `save`; "advance 1000" with no employer → phase `CLARIFY`, speak asks employer; "Ramesh" next → phase `CONFIRM` with read-back containing "Ramesh" and "1000"; `tap_yes` in CONFIRM → `save` defined with `source:'worker'`; **no path produces `save` without a `confirm`/`tap_yes`**; "nahi, 800" in CONFIRM → read-back again with 800; after 2 low-confidence retries, speak text-input fallback hint.
- [ ] **Step 2: Run** `npx vitest run tests/dialogue.test.ts` Expected: FAIL.
- [ ] **Step 3: Implement** `step` as a pure reducer.
- [ ] **Step 4: Run** Expected: PASS.
- [ ] **Step 5: Commit** `feat: dialogue state machine`

### Task 6: Speech input/output adapters

**Files:**
- Create: `src/voice/speechInput.ts`, `src/voice/speechOutput.ts`, `tests/speech.test.ts`

**Interfaces:**
- Produces:
  - `isSpeechSupported(): boolean`
  - `listen(lang: Lang): Promise<{ text: string; confidence: number }>` (rejects with `'denied' | 'unsupported' | 'no_speech'`)
  - `speak(text: string, lang: Lang): Promise<void>` (voice fallback to `en-IN`)

- [ ] **Step 1: Failing tests** (mock `window.SpeechRecognition`/`speechSynthesis`): unsupported env → `isSpeechSupported() === false` and `listen` rejects `'unsupported'`; mocked result → `listen` resolves with its transcript and confidence; `speak` uses a voice matching the language when available, else `en-IN`.
- [ ] **Step 2: Run** `npx vitest run tests/speech.test.ts` Expected: FAIL.
- [ ] **Step 3: Implement** wrappers around `webkitSpeechRecognition` and `speechSynthesis`.
- [ ] **Step 4: Run** Expected: PASS.
- [ ] **Step 5: Commit** `feat: speech adapters`

**Phase 3 gate:** `npm test` and `npm run build` green. Manual: in Chrome, speak a record, hear the read-back, say "yes". Report result.

---

## Phase 4: Screens

### Task 7: Voice screen, home, ledger, employers, payments, settings

**Files:**
- Create: `src/ui/Home.tsx`, `src/ui/VoiceScreen.tsx`, `src/ui/Ledger.tsx`, `src/ui/Employers.tsx`, `src/ui/Payments.tsx`, `src/ui/Settings.tsx`, `src/ui/useDialogue.ts`, `src/i18n/{en,hi,kn}.json`, `tests/ui.test.tsx`
- Modify: `src/App.tsx` (tab navigation)

**Interfaces:**
- Consumes: `step`, `listen`, `speak`, `db`, ledger/queries.
- Produces: `useDialogue(): { state; phrase: string; micOn: boolean; start(): void; typed(text: string): void; yes(): void; no(): void }`

- [ ] **Step 1: Failing tests** (RTL): Home shows a mic button >= 96px (class check) and the outstanding balance from seeded data; with `isSpeechSupported() === false`, a text input is shown instead; Settings language switch changes the visible label language; Ledger lists entries newest first with a "Worker-recorded" badge.
- [ ] **Step 2: Run** `npx vitest run tests/ui.test.tsx` Expected: FAIL.
- [ ] **Step 3: Implement** screens and `useDialogue` wiring `listen`/`speak`/`step`/`db`.
- [ ] **Step 4: Run** `npm test && npm run build` Expected: PASS.
- [ ] **Step 5: Commit** `feat: core screens`

**Phase 4 gate:** manual core flow in Chrome (speak, confirm, appears in ledger, ask "Ramesh ne kitna dena hai?", hear balance).

---

## Phase 5: Proof and trust

### Task 8: PDF statement, trust labels, edit/delete, demo mode

**Files:**
- Create: `src/domain/statement.ts`, `src/ui/DemoBar.tsx`, `tests/statement.test.ts`
- Modify: `src/ui/Ledger.tsx` (confirm/edit/delete), `src/ui/Settings.tsx` (demo toggle)

**Interfaces:**
- Produces:
  - `buildStatementRows(entries: Entry[], employer: Employer): { rows: string[][]; totals: ReturnType<typeof totals> }`
  - `downloadStatement(entries: Entry[], employer: Employer, workerName: string): Promise<void>` (uses `navigator.share` if available, else download)
  - `confirmByEmployer(id: string): Promise<void>` sets `source = 'employer_confirmed'`
  - `DemoBar`: shows "DEMO MODE" and a "Play sample" button feeding canned transcripts through `step`.

- [ ] **Step 1: Failing tests:** `buildStatementRows` gives one row per entry with the source label, and totals outstanding 200 for the Task 1 fixture; `confirmByEmployer` flips source; demo toggle renders "DEMO MODE"; deleting an entry removes it and changes the balance.
- [ ] **Step 2: Run** `npx vitest run tests/statement.test.ts` Expected: FAIL.
- [ ] **Step 3: Implement** with jsPDF + autotable; footer "Worker-recorded unless marked Employer-confirmed".
- [ ] **Step 4: Run** `npm test && npm run build` Expected: PASS.
- [ ] **Step 5: Commit** `feat: statement, trust labels, demo mode`

**Phase 5 gate:** manual: PDF downloads and opens; demo mode runs offline.

---

## Phase 6: Edge mode (cut first if time runs short)

### Task 9: Local LLM parser with hallucination guard

**Files:**
- Create: `server/index.ts`, `src/nlu/llmParser.ts`, `tests/llmParser.test.ts`
- Modify: `src/voice/dialogue.ts` (use `parseWithFallback`)

**Interfaces:**
- Produces: `parseWithFallback(text: string, ctx): Promise<Intent>` (tries `POST /api/parse` to the local model, validates with `validateDraft`, falls back to `parseUtterance` on error, timeout of 4 s, or guard failure)

- [ ] **Step 1: Failing tests** (mock fetch): server down → result equals `parseUtterance`; LLM returns amount 800 for transcript with only "700" → rejected, falls back; valid LLM JSON with amount present in the transcript → used.
- [ ] **Step 2: Run** `npx vitest run tests/llmParser.test.ts` Expected: FAIL.
- [ ] **Step 3: Implement** the proxy to Ollama (`gemma-4-E2B`, temperature 0, JSON schema) and the client.
- [ ] **Step 4: Run** `npm test && npm run build` Expected: PASS.
- [ ] **Step 5: Benchmark:** run ~30 utterances through Gemma E2B and Qwen2.5-3B, record amount accuracy and invented fields in `docs/BENCHMARK.md`, and keep the winner.
- [ ] **Step 6: Commit** `feat: optional local LLM parsing`

---

## Phase 7: Submission

### Task 10: Ship

**Files:**
- Modify: `README.md`; Create: `docs/screenshots/`

- [ ] **Step 1:** Fresh clone into a new directory, run `npm install && npm run dev` with no `.env`; core flow works.
- [ ] **Step 2:** README: setup, demo-mode note, optional edge mode, screenshots.
- [ ] **Step 3:** Record the demo (under 2:45): speak, read-back, confirm, ledger, ask balance, share PDF; upload to YouTube (unlisted or public).
- [ ] **Step 4:** Export the deck PDF (Problem, Users, Solution, Dependencies, Impact/pilot, Risks, Launch plan).
- [ ] **Step 5:** Verify the repo is public and links work in a private window; submit before 30 Nov, 11:59 pm.

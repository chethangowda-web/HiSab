# BoliHisab 🎙️

**Speak your workday, wages and advances. BoliHisab keeps the hisab.**

A voice-first wage tracker for India's informal workers: construction workers, painters, domestic
workers and daily-wage labourers. Many work on verbal agreements and memory, so days, advances and
unpaid balances get forgotten or disputed. BoliHisab lets a worker simply *say* what happened, in
**Kannada, Hindi, English or a mix**, and keeps a dated record they can show.

Built for **Build for Bharat, Round 2** (theme: *Livelihoods and small business*).

> **Live demo:** https://chethangowda-web.github.io/HiSab/ (open in **Chrome** for voice)
> No sign-up. Tap **Try the demo** on the first screen.

## What it does

1. **Speak** — tap the big mic and say *"Aaj Ramesh ke site pe 700 rupaye kaam kiya"*.
2. **Check** — the app shows what it understood as a large card (employer, amount, type, date) and
   reads it back. It also shows **"You said: …"** so a mis-hearing is easy to spot.
3. **Confirm** — say *"haan"* or tap ✓. **Nothing is saved without a yes**, and an **Undo** bar follows.
4. **Ask** — *"Ramesh ne kitna dena hai?"* and it answers out loud, in your language.
5. **Prove** — open an employer's **Statement** and *Save as PDF* or share a summary on WhatsApp.

Also: ledger grouped by day, employers, advances and payments, employer-confirmed marks
("Worker-recorded" vs "Employer-confirmed"), edit and delete, and a labelled **Demo mode**.

### Safety rules the app enforces

- Never saves an amount without a spoken or tapped confirmation.
- Asks again when speech is unclear or a field is missing, instead of guessing.
- A sentence with **two different amounts** is refused, never merged into one record.
- An amount must actually appear in what was said (this is also what guards the optional AI model).
- Real records and demo data are kept apart; turning demo mode off never touches real records.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

**No API keys, no accounts, nothing to configure.** Use **Chrome** (desktop or Android) for voice.
Without speech support the app shows a text box instead, so everything still works by typing.

```bash
npm test           # 386 tests
npm run build      # type-check + production build
```

### Try it without a microphone

1. Open the app and tap **▶ Try the demo** (or Settings → Demo mode).
2. Tap **▶ Play sample**. It runs a scripted sentence through the *real* parser, dialogue and ledger:
   record → confirm → ask the balance, in the current language.
3. Switch language from the header (ಕ / हि / EN) and play it again.

## Optional: local AI helper ("edge mode")

The app understands speech with a built-in, rule-based parser that never invents an amount. For
sentences the rules can't fully understand, you can turn on **Smart helper** in Settings to ask a
small **open-source model running on your own machine**: no cloud, no per-call cost, no key.

```bash
ollama pull <model tag>                 # e.g. a Gemma or Qwen build
LOCAL_LLM_MODEL=<model tag> npm run edge   # proxy on :8787
npm run dev                             # Settings → Smart helper
```

The model can only **fill fields the rules missed**, and every value it returns must appear in the
sentence the user actually said, otherwise it is dropped. If the proxy or model is down, the app
quietly uses the rules. Compare models on 43 labelled sentences with `npm run bench -- --model <tag>`
(see [docs/BENCHMARK.md](docs/BENCHMARK.md)). The rule parser's baseline is measured there; **the
model rows are not filled in yet**.

## How it is built

React + TypeScript + Vite + Tailwind. Records are stored **on the device** (IndexedDB via Dexie);
there is no backend. Speech uses the browser's built-in recognition and synthesis.

```
src/
  voice/     speech in/out adapters, the dialogue state machine
  nlu/       number & date normalizer (Kannada/Hindi/English), rule parser, validator, optional LLM client
  domain/    ledger maths (integer rupees), queries, statements, edit rules
  db/        IndexedDB, demo data
  ui/        screens and components
  i18n/      spoken and written text in all three languages
server/      optional proxy to a local model
bench/       labelled sentences and a benchmark runner
docs/        PRD, TRD, architecture, rules, benchmark
```

Design docs: [PRD](docs/PRD.md) · [TRD](docs/TRD.md) · [Architecture](docs/ARCHITECTURE.md) · [Rules](docs/RULES.md).

## Honest limits

- **Voice quality is the biggest unknown.** Browser speech recognition for Kannada and Hindi varies
  with accent and noise, and Chrome sends the audio to Google, so voice needs a connection. The
  confirm-before-save step and typed fallback exist because of this. It has been tested with scripted
  sentences and a fake recognizer, **not yet with many real speakers**.
- The Hindi and Kannada wording was written by the author and **needs review by native speakers**.
- "Employer confirms" is a tap on the worker's phone, not a separate employer app or login.
- The app needs a connection to load the first time. There is no offline service worker yet.
- PDF export uses the browser's *Save as PDF* (so Kannada and Hindi text is shaped correctly).
- Data lives only on one device: no sync or backup yet.

## Pilot goal

A pilot with **500 workers in Bengaluru** is a *goal*, not something already achieved.

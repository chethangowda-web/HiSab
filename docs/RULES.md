# BoliHisab – Rules

## A. Hackathon submission rules (from the brief)
1. **Voice-first:** the main task is done by speaking.
2. One theme, one real problem, **one core flow working end to end**. Not a full product.
3. Submit **once only**, by **30 Nov, 11:59 pm**. One submission per team.
4. Required:
   - GitHub repo: **public, starts without any secret keys**.
   - YouTube demo: public or unlisted, **max 3 minutes**, showing the product working.
   - Pitch deck: **PDF** covering the problem, users, what it depends on, launch plan.
   - Live link: optional bonus.
5. Round 1 text limits were 80–800 words for the prompt and 50–500 for impact. These are already submitted.

## B. Product rules (non-negotiable)
1. **Never save a financial amount without read-back and explicit confirmation.**
2. If speech confidence is low, **ask to repeat**. Never guess an amount.
3. Missing field means a **spoken follow-up**, not a silent default.
4. Worker-recorded and employer-confirmed entries are **always visually distinct**.
5. The user's language setting controls both spoken and written output.
6. Demo mode is **always labelled**. Never present canned data as real.
7. Money is **integer rupees**. No floats.
8. No claims of real users or reach in the deck. Targets are described as a pilot goal.

## C. Engineering rules
1. **No secrets in the repo.** `.env` is gitignored, `.env.example` is committed, and the app must run with it absent.
2. The app must start with `npm install && npm run dev`. Check this on a clean clone before submitting.
3. The LLM path is optional and every call has a rule-based fallback.
4. Domain logic (ledger, parser, validator) is **pure and unit tested**. UI never does money math.
5. Feature-detect speech APIs. Unsupported means a typed or tap fallback, never a crash.
6. Touch targets are at least 56px, and the mic is at least 96px. Font is at least 18px.
7. Keep the scope: anything not in PRD P0/P1 waits until after submission.
8. Commit small and often. Use `main` as the submission branch, and don't force-push after submission.

## D. Demo and deck rules
1. The demo video follows the PRD core flow in this order: speak, read-back, confirm, ledger update, ask balance, share PDF. Keep it under 2:45 to leave a buffer.
2. Record on a Chrome browser with a working mic, in a quiet room first, with one noisy-room clip if time permits.
3. Show Kannada or Hindi speech, not only English.
4. Deck (PDF) sections: Problem, Users, Solution and demo screenshot, What it depends on (browser speech, optional LLM, IndexedDB), Impact and pilot plan, Risks, Launch plan.
5. Submit only after the checklist below is complete.

## E. Pre-submit checklist
- [ ] Clean clone runs with no keys
- [ ] Core flow works in Chrome (Android and desktop)
- [ ] Repo is public, with a README (setup, demo-mode note, screenshots)
- [ ] Demo video is up to 3 minutes and set to public or unlisted
- [ ] Deck PDF exported
- [ ] Links tested in a private window
- [ ] Submitted before 30 Nov, 11:59 pm

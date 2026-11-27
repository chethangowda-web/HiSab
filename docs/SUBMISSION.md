# Submission kit — Build for Bharat, Round 2

Deadline: **30 Nov, 11:59 pm** · One submission per team, only once.

## Checklist

- [ ] GitHub repo public, starts without keys: https://github.com/chethangowda-web/HiSab
- [ ] Live link: repo **Settings → Pages → Source: GitHub Actions**, then re-run the "Deploy to GitHub Pages" action
      → https://chethangowda-web.github.io/HiSab/ (phone speech only; Wispr Flow needs the server)
- [ ] Wispr Flow key tested locally: `WISPR_API_KEY=... npm run server` + `npm run dev`, Settings shows "connected"
- [ ] Demo video (≤ 3 min, public or unlisted on YouTube)
- [ ] Pitch deck PDF
- [ ] `docs/BUILT_BY_VOICE.md` filled in with your real Wispr Flow prompts

## Demo video script (target 2:40)

Record on a phone (or Chrome's phone view), Hindi or Kannada UI, Wispr Flow connected, demo mode **off**.

| Time | Show | Say / do |
|---|---|---|
| 0:00–0:15 | Face or B-roll of a site | "Lakhs of daily-wage workers in India are paid on verbal promises. Days and advances get forgotten, and wages go unpaid." |
| 0:15–0:25 | App home | "BoliHisab: say what happened, in your language. No typing." |
| 0:25–0:50 | Tap mic, listening screen (Wispr Flow badge) | Say **"Aaj Ramesh ke yahan 700 rupaye kaam kiya"**. Show the card, "You said", ▶ voice proof, say **"haan"**. |
| 0:50–1:10 | Mic again | Say **"Ramesh ke yahan 3 din kaam kiya"**. Point at the three dates and "3 × ₹700 · Ramesh's usual rate". Say "haan". |
| 1:10–1:25 | Mic | Kannada: **"ರಮೇಶ್ ಅವರು ನನಗೆ ಎಷ್ಟು ಕೊಡಬೇಕು?"** (or Hindi **"Ramesh ne kitna dena hai?"**). It answers out loud. |
| 1:25–1:50 | Mic | **"Ramesh ko yaad dilao"** → WhatsApp preview → Send → WhatsApp opens with the message. |
| 1:50–2:10 | Ledger | Press ▶ on an entry: "My own voice, from that day. If there's ever a dispute, this is proof." |
| 2:10–2:25 | Employers → Statement | Save as PDF / share summary. |
| 2:25–2:40 | Close | "Built by voice with Wispr Flow. Nothing is saved without a yes. Your records stay on your phone." |

Tips: speak slowly the first time; if a word is misheard, show the "No, 800" correction (it is a feature).

## Pitch deck outline (8–10 slides)

1. **Problem** — informal workers (construction, painting, domestic work) are paid on verbal agreements;
   no records → forgotten days, disputed advances, unpaid wages. Typing apps don't work for them.
2. **User** — one persona: a daily-wage worker in Bengaluru, Kannada/Hindi speaker, basic Android phone,
   limited reading. What their week looks like.
3. **Solution** — BoliHisab: speak → check the card → say yes. Screenshots of home, confirm card, ledger.
4. **Why voice-first works here** — no typing, the read-back + "You said" catches mistakes, everything is
   speakable (records, questions, statement, reminders, undo).
5. **Trust** — voice proof clips, worker-recorded vs employer-confirmed, statement PDF, WhatsApp reminder.
6. **How it works / what it depends on** — Wispr Flow (transcription, with employer names as a dictionary),
   phone speech as fallback, rule-based understanding that never invents an amount, data on the device
   (IndexedDB), optional small open-source model for hard sentences. Honest limits.
7. **Built by voice** — how the team built it with Wispr Flow (a few real prompts, time saved).
8. **Impact & pilot** — pilot **goal**: 500 workers in Bengaluru (not achieved yet). Metrics: active
   workers, entries per week, disputes resolved with a statement or clip.
9. **Launch plan** — pilot with a labour union or contractor network → WhatsApp-first onboarding →
   employer confirmation link → regional languages. Cost: on-device data, per-sentence transcription.
10. **Ask / team.**

## Answers to likely judge questions

- *What if speech is wrong?* Every entry is read back and shown as a card; nothing is saved without a yes;
  amounts must have been said (or be the known rate); a sentence with two amounts is refused.
- *Where is data stored?* Only on the worker's phone. Voice clips too. No account.
- *Does it work offline?* Records and typing do; voice needs a connection (Wispr Flow / phone speech).
- *Why not just WhatsApp voice notes?* They can't be totalled, searched or turned into a statement.

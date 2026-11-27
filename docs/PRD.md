# BoliHisab – Product Requirements (PRD)

**Hackathon:** Build for Bharat, Round 2. **Theme:** Livelihoods and small business.
**One-liner:** Speak your workday, wages and advances. BoliHisab keeps the record and tells you what you're owed.

## 1. Problem
India's informal workers (construction, painters, domestic help, daily-wage labour) work on verbal agreements and memory. Days, advances and unpaid balances get forgotten or disputed. Notebooks and typing-based apps don't work for people with limited literacy or digital skills.

## 2. Users
- **Primary:** daily-wage worker, low literacy, uses a basic Android phone, speaks Kannada/Hindi, mixes English words ("advance", "overtime").
- **Secondary:** employer or contractor who can confirm entries.

## 3. Goals
1. Record a workday or payment by speaking in under 15 seconds.
2. Never store a wrong amount (read-back and confirm).
3. Answer "how much is pending?" by voice.
4. Produce a shareable wage statement as proof.

## 4. Non-goals (this round)
Real payments, full employer app, accounts/login, multi-device sync, legal dispute flow, languages beyond Kannada/Hindi/English.

## 5. Core user flow (what the demo shows)
1. Worker opens app, taps big mic.
2. Says: "Aaj Ramesh ke site pe 700 rupaye kaam kiya."
3. App replies by voice: "Ramesh, today, 700 rupees. Save?"
4. Worker says "haan". Entry saved and appears in the ledger.
5. Worker says: "Ramesh ne kitna dena hai?" App speaks the balance.
6. Worker taps **Share statement** and gets a PDF.

## 6. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| F1 | Large mic button on home; works with Kannada, Hindi, English and mixed speech | P0 |
| F2 | Extract: date, employer, wage, hours, overtime, advance, payment from speech | P0 |
| F3 | Ask a spoken follow-up when a field is missing/unclear | P0 |
| F4 | Read back every financial entry and require spoken or tapped confirmation before saving | P0 |
| F5 | Persistent ledger across multiple employers | P0 |
| F6 | Compute days worked, earnings, overtime, advances, payments, outstanding | P0 |
| F7 | Voice queries ("how much has Ramesh not paid", "this month's earnings") answered by speech in chosen language | P0 |
| F8 | Low-confidence speech triggers "please repeat"; never guesses an amount | P0 |
| F9 | Dashboard, earnings summary, work ledger, employer history, payment records, language settings | P0 |
| F10 | Downloadable PDF wage statement per employer | P1 |
| F11 | Entries labelled **Worker-recorded** vs **Employer-confirmed**; employer confirm via share link or tap | P1 |
| F12 | Edit/delete an entry manually | P1 |
| F13 | Clearly labelled **Demo mode** (canned transcripts, sample data) if speech/AI is unavailable | P0 |
| F14 | Optional LLM parsing when an API key is configured | P2 |
| F15 | Optional live deployment | P2 |

## 7. Success metrics (pilot targets, not claims)
- Entry time under 15 s.
- Wage-calculation accuracy 100% on test cases.
- Parser correct on at least 90% of the scripted test utterances.
- Pilot goal: 500 workers in Bengaluru.

## 8. Risks
| Risk | Mitigation |
|---|---|
| STT is poor with accents/noise | Confidence threshold, repeat prompt, confirmation, tap fallback, manual edit |
| Browser lacks Kannada STT | Hindi/English fallback, Demo mode, typed input |
| Judges can't run with keys | No keys required; labelled demo mode |
| Scope creep in 3 days | Only the one core flow is P0 |

## 9. Submission deliverables
Public GitHub repo (runs with no secrets), YouTube demo of up to 3 min, pitch deck PDF (problem, users, dependencies, launch plan), optional live link. **Deadline: 30 Nov, 11:59 pm.**

# BoliHisab v2 — Wispr Flow, voice proof, rates, multi-day, voice commands

Approved by the user from the mockups in `design/mockups.html` (2026-11-27). Goal: win Build for Bharat
Round 2 ("Build something India uses", built by voice with Wispr Flow). Deadline 30 Nov 11:59 pm.

## Intent

Make BoliHisab feel like a product a worker would use every day, and make real use of the sponsor's
technology: Wispr Flow transcribes the worker, the worker's own voice becomes proof, and every main
action can be spoken.

## Features (in build order)

1. **Remembered daily rate.** The first work entry for an employer teaches their daily rate. Later,
   "aaj Ramesh ke yahan kaam kiya" fills ₹700 itself (marked "usual rate", still read back and
   confirmed). "Ramesh ka rate 750 hai" changes it (confirmed). Rates editable in Settings.
2. **Several days in one sentence.** "3 din" / "teen din" / "3 days" / "ಮೂರು ದಿನ" → N consecutive
   dated work entries ending on the spoken date (default today). Per-day amount: the usual rate; or a
   spoken amount with "roz / per day / daily / ಪ್ರತಿದಿನ"; otherwise a spoken amount is the total and must
   divide evenly. 1 ≤ N ≤ 31. Read-back shows "3 × ₹700 = ₹2,100" and the dates.
3. **Voice commands**, each confirmed before acting:
   - "Ramesh ka hisab dikhao" → opens Ramesh's statement.
   - "Ramesh ko yaad dilao" → a polite reminder in the current language, shown as a WhatsApp
     preview; "Send" opens WhatsApp (`wa.me`). Nothing is sent without a tap.
   - "aakhri entry hatao" → reads back the last entry and deletes it on yes.
   - "Ramesh ka rate 750 hai" → sets the rate on yes.
4. **Voice proof.** Each spoken entry keeps the worker's audio clip on the device (IndexedDB, own
   table). ▶ on the confirm card and every ledger row; "Voice proof" badge; deleting/undoing an entry
   deletes its clip. Setting to turn off. Typed entries have no clip.
5. **Wispr Flow as the speech engine.** The browser records audio (with a live waveform and automatic
   stop after ~1.5 s of silence, max 15 s), converts it to 16 kHz mono 16-bit WAV, and sends it to our
   server `POST /api/transcribe`, which adds the secret key and calls Wispr Flow's REST API with the
   language and a `dictionary_context` of known employer names. Without a key or server, the app
   uses Chrome speech automatically. `GET /api/voice-health` says whether Wispr Flow is configured.
6. **Listening screen** (full screen, waveform, Done / Cancel; live words only with Chrome speech),
   **voice-command chips** on Home, **Settings**: voice engine, voice proof, daily rates.
7. **Submission docs**: "Built by voice" page, video script, deck outline.

## Constraints

- Repo runs with no keys. `WISPR_API_KEY` lives only in the server's environment, never in the
  browser bundle or the repo.
- Every rule from v1 stays: nothing saved without a yes; amounts must come from what was said **or
  from the employer's known rate** (clearly labelled); two different amounts in a sentence are refused.
- Money is integer rupees.

## Deviations from the mockups (told to the user)

- Wispr Flow returns text after speech ends, not word by word; live words appear only in Chrome mode.
- The public GitHub Pages link cannot hold the key, so it uses Chrome speech; Wispr Flow needs the
  local server, or a host with server functions (decided when the key arrives).

## Approaches considered

- *Wispr WebSocket vs REST:* REST chosen. The WebSocket gives partials only about every 30 s, so no
  live-words benefit, and REST is simpler and easier to make reliable.
- *Client tokens vs server proxy:* proxy chosen; it is simpler and the key never reaches the browser.
  Client tokens still need a server to mint them.
- *Voice commands via LLM vs rules:* rules, consistent with v1 (no invented values, works offline from
  any model).

## Left to the builder

Exact wording of reminder messages, waveform styling, and the Wispr response field name (undocumented:
read `text`, falling back to `body.text` / `transcript`, and treat anything else as a failure that
falls back to Chrome speech).

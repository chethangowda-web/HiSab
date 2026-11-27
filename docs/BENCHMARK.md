# Parser benchmark

Compares ways of turning a spoken sentence into a record, on 43 labelled sentences in
[`bench/cases.ts`](../bench/cases.ts): English, Hinglish, Hindi and Kannada, including 12 "hard" ones
(messy phrasing, and traps where inventing a value is tempting). Labels are the author's judgement
of what the worker meant; fix any you disagree with.

## What is measured

| Column | Meaning |
|---|---|
| kind / type / employer / amount | Share of sentences where that field was right (only sentences whose label has the field) |
| **hallucinated amounts** | An amount that is wrong, or given when none was said. **Must be 0.** |
| invented employers | A name that does not appear in the sentence |
| invented hours | Hours given that are not the right ones |
| parse failures | Output was not valid JSON for the schema |
| hard-set kind | `kind` accuracy on the 12 hard sentences |
| avg ms | Average time per sentence |

Model results are **raw**, before the app's guard, so hallucinations are visible. In the app, the guard
(`src/nlu/llmParser.ts`) drops any amount, hours or employer that does not appear in what was said.

## Results

| model | n | kind | type | employer | amount | hallucinated amounts | invented employers | invented hours | parse failures | hard-set kind | avg ms |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **rules** (built in) | 43 | 98% | 96% | 86% | 100% | 0 | 0 | 0 | 0 | 92% | 0 |
| google/gemma-4-E2B | | | | | | | | | | | *not run yet* |
| Qwen2.5-3B-Instruct | | | | | | | | | | | *not run yet* |

The **rules** row was measured by `npm run bench -- --model rules` on 2026-11-27.
The model rows have **not** been measured: this machine has no local model runtime. Run them with the commands below.

### What the baseline shows

The rule parser never invents an amount (it only reads numbers that were said) and gets every amount right.
Its weak spot is **finding the employer** when a sentence has no marker such as "at", "ke" or "ne".
That is the gap the local model is for. A model is only worth turning on if it beats 86% on employer
**and** keeps hallucinated amounts at 0.

Bugs this benchmark found in the rules, now fixed: "Mahesh **bhai** ne diya" named the employer "Bhai";
"Ramesh sir ..." and "ramesh anna ..." were missed. Honorifics (sir, anna, bhai, ...) are now markers.

## Running a model

```bash
# 1. Start Ollama (or any Ollama-compatible server) and pull the model you want to test
ollama pull <model tag>

# 2. Score it
npm run bench -- --model <model tag>            # add  --url http://host:11434  if not local
```

This prints a table row (paste it above) and saves per-sentence results to `bench/results/<model>.json`,
which shows exactly which sentences it got wrong.

## Choosing

Keep the model that has the **highest employer and hard-set accuracy with 0 hallucinated amounts**,
at a speed that feels right on the target device. If neither beats the rules on employer accuracy,
leave Smart helper off: the product is better without it.

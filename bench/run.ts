/**
 * Compare parsers and local models on the labelled sentences in cases.ts.
 *
 *   npm run bench -- --model rules
 *   npm run bench -- --model <ollama tag> [--url http://localhost:11434]
 *
 * Needs a running Ollama-compatible server for anything other than "rules".
 * Results are printed as a markdown row and saved to bench/results/<model>.json.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { askModel } from '../server/ollama';
import { CASES } from './cases';
import { normalizeRaw, rulesPredictor, runCases, type Predictor } from './runner';
import { aggregate } from './score';

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const model = arg('model', 'rules')!;
const url = arg('url', process.env.LOCAL_LLM_URL ?? 'http://localhost:11434')!;

const predictor: Predictor =
  model === 'rules'
    ? rulesPredictor
    : async (c) =>
        normalizeRaw(
          await askModel({ url, model }, { transcript: c.text, lang: c.lang ?? 'en-IN', knownEmployers: [], today: '2026-11-27' }),
        );

const results = await runCases(predictor, CASES);
const a = aggregate(results.map((r) => r.score));
const avgMs = results.reduce((s, r) => s + r.ms, 0) / results.length;
const hard = aggregate(results.filter((r) => r.case.hard).map((r) => r.score));
const pct = (x: number) => `${Math.round(x * 100)}%`;

console.log('| model | n | kind | type | employer | amount | hallucinated amounts | invented employers | invented hours | parse failures | hard-set kind | avg ms |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
console.log(
  `| ${model} | ${a.n} | ${pct(a.kindAccuracy)} | ${pct(a.typeAccuracy)} | ${pct(a.employerAccuracy)} | ${pct(a.amountAccuracy)} | ${a.hallucinatedAmounts} | ${a.inventedEmployers} | ${a.inventedHours} | ${a.parseFailures} | ${pct(hard.kindAccuracy)} | ${Math.round(avgMs)} |`,
);

mkdirSync('bench/results', { recursive: true });
const file = `bench/results/${model.replace(/[^a-z0-9._-]/gi, '_')}.json`;
writeFileSync(
  file,
  JSON.stringify(
    {
      model,
      date: new Date().toISOString().slice(0, 10),
      summary: { ...a, avgMs: Math.round(avgMs), hardKindAccuracy: hard.kindAccuracy },
      cases: results.map((r) => ({ text: r.case.text, hard: !!r.case.hard, gold: r.case.gold, pred: r.pred, ms: Math.round(r.ms) })),
    },
    null,
    2,
  ),
);
console.error(`saved ${file}`);

import type { Intent } from '../src/domain/types';
import { readRaw } from '../src/nlu/llmParser';
import { parseUtterance } from '../src/nlu/ruleParser';
import type { BenchCase } from './cases';
import { scoreCase, type CaseScore, type Pred } from './score';

export type Predictor = (c: BenchCase) => Promise<Pred | null>;

export interface CaseResult {
  case: BenchCase;
  pred: Pred | null;
  score: CaseScore;
  ms: number;
}

/** Runs every case through a predictor. A predictor that throws counts as a parse failure. */
export async function runCases(predict: Predictor, cases: BenchCase[]): Promise<CaseResult[]> {
  const out: CaseResult[] = [];
  for (const c of cases) {
    const t0 = performance.now();
    let pred: Pred | null = null;
    try {
      pred = await predict(c);
    } catch {
      pred = null;
    }
    out.push({ case: c, pred, score: scoreCase(pred, c.gold, c.text), ms: performance.now() - t0 });
  }
  return out;
}

export function intentToPred(i: Intent): Pred {
  switch (i.kind) {
    case 'record': {
      const d = i.draft;
      return {
        kind: 'record',
        ...(d.type ? { type: d.type } : {}),
        ...(d.employerName ? { employerName: d.employerName } : {}),
        ...(d.amount !== undefined ? { amount: d.amount } : {}),
        ...(d.hours !== undefined ? { hours: d.hours } : {}),
      };
    }
    case 'query':
      return { kind: 'query', q: i.q, ...(i.employerName ? { employerName: i.employerName } : {}) };
    default:
      return { kind: i.kind };
  }
}

/** The rule parser as a baseline for the models to beat. */
export const rulesPredictor: Predictor = async (c) =>
  intentToPred(parseUtterance(c.text, { today: '2026-11-27', employers: [], lang: c.lang ?? 'en-IN' }));

/** Turns a model's raw JSON into a prediction, with no guards, so hallucinations are visible. */
export function normalizeRaw(raw: unknown): Pred | null {
  const r = readRaw(raw);
  if (!r) return null;
  return {
    kind: r.kind,
    ...(r.type ? { type: r.type } : {}),
    ...(r.employerName ? { employerName: r.employerName } : {}),
    ...(r.amount !== null ? { amount: r.amount } : {}),
    ...(r.hours !== null ? { hours: r.hours } : {}),
    ...(r.q ? { q: r.q } : {}),
  };
}

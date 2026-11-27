import type { EntryType, QueryKind } from '../src/domain/types';

export interface Pred {
  kind: 'record' | 'query' | 'command' | 'confirm' | 'deny' | 'unknown' | 'repeat';
  type?: EntryType;
  employerName?: string;
  amount?: number;
  hours?: number;
  q?: QueryKind;
}
export type Gold = Pred;

export interface CaseScore {
  parseFailure: boolean;
  kindOk: boolean;
  typeOk?: boolean;
  employerOk?: boolean;
  amountOk?: boolean;
  hoursOk?: boolean;
  qOk?: boolean;
  /** An amount was given that is not the right one (including one given when none was said). */
  hallucinatedAmount: boolean;
  /** A name was given that does not appear in the sentence. */
  inventedEmployer: boolean;
  /** Hours were given that are not the right ones. */
  inventedHours: boolean;
}

const norm = (s: string) => s.normalize('NFC').toLowerCase();

/** Scores one prediction against the labelled answer. Only fields the answer defines are scored. */
export function scoreCase(pred: Pred | null, gold: Gold, transcript: string): CaseScore {
  if (!pred) {
    return { parseFailure: true, kindOk: false, hallucinatedAmount: false, inventedEmployer: false, inventedHours: false };
  }
  const said = norm(transcript);
  const score: CaseScore = {
    parseFailure: false,
    kindOk: pred.kind === gold.kind,
    hallucinatedAmount: pred.amount !== undefined && pred.amount !== gold.amount,
    inventedEmployer: pred.employerName !== undefined && !norm(pred.employerName).split(/\s+/).every((w) => said.includes(w)),
    inventedHours: pred.hours !== undefined && pred.hours !== gold.hours,
  };
  if (gold.type !== undefined) score.typeOk = pred.type === gold.type;
  if (gold.employerName !== undefined) score.employerOk = pred.employerName !== undefined && norm(pred.employerName) === norm(gold.employerName);
  if (gold.amount !== undefined) score.amountOk = pred.amount === gold.amount;
  if (gold.hours !== undefined) score.hoursOk = pred.hours === gold.hours;
  if (gold.q !== undefined) score.qOk = pred.q === gold.q;
  return score;
}

const rate = (xs: (boolean | undefined)[]) => {
  const defined = xs.filter((x): x is boolean => x !== undefined);
  return defined.length === 0 ? 0 : defined.filter(Boolean).length / defined.length;
};
const count = (xs: boolean[]) => xs.filter(Boolean).length;

export function aggregate(scores: CaseScore[]) {
  return {
    n: scores.length,
    kindAccuracy: scores.length ? count(scores.map((s) => s.kindOk)) / scores.length : 0,
    typeAccuracy: rate(scores.map((s) => s.typeOk)),
    employerAccuracy: rate(scores.map((s) => s.employerOk)),
    amountAccuracy: rate(scores.map((s) => s.amountOk)),
    hoursAccuracy: rate(scores.map((s) => s.hoursOk)),
    hallucinatedAmounts: count(scores.map((s) => s.hallucinatedAmount)),
    inventedEmployers: count(scores.map((s) => s.inventedEmployer)),
    inventedHours: count(scores.map((s) => s.inventedHours)),
    parseFailures: count(scores.map((s) => s.parseFailure)),
  };
}

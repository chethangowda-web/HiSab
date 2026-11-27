import type { Employer, Entry, Intent } from './types';
import { balance, daysWorked, earned, totals } from './ledger';

export type QueryResult = {
  key: 'owed' | 'earned' | 'advances' | 'days' | 'unknown_employer' | 'ambiguous_employer';
  amount?: number;
  employerName?: string;
};

type QueryIntent = Extract<Intent, { kind: 'query' }>;

/** Exact (case-insensitive) match wins; otherwise a prefix match. */
export function matchEmployers(name: string, employers: Employer[]): Employer[] {
  const n = name.trim().toLowerCase();
  const exact = employers.filter((e) => e.name.toLowerCase() === n);
  if (exact.length) return exact;
  return employers.filter((e) => e.name.toLowerCase().startsWith(n));
}

export function answerQuery(
  q: QueryIntent,
  entries: Entry[],
  employers: Employer[],
  today: string,
): QueryResult {
  let scope: Employer[] = employers;
  if (q.employerName) {
    const found = matchEmployers(q.employerName, employers);
    if (found.length === 0) return { key: 'unknown_employer', employerName: q.employerName };
    if (found.length > 1) return { key: 'ambiguous_employer', employerName: q.employerName };
    scope = found;
  }
  const employerName = q.employerName ? scope[0].name : undefined;
  const ids = scope.map((e) => e.id);

  switch (q.q) {
    case 'owed':
      return { key: 'owed', amount: ids.reduce((t, id) => t + balance(entries, id), 0), employerName };
    case 'advances':
      return { key: 'advances', amount: ids.reduce((t, id) => t + totals(entries, id).advances, 0), employerName };
    case 'days':
      return { key: 'days', amount: ids.reduce((t, id) => t + daysWorked(entries, id), 0), employerName };
    case 'earned': {
      const month = q.period === 'month' ? today.slice(0, 7) : undefined;
      const amount = q.employerName
        ? earned(entries, { employerId: scope[0].id, month })
        : earned(entries, { month });
      return { key: 'earned', amount, employerName };
    }
  }
}

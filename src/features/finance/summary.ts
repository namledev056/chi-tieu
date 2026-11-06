import type { Budget, Transaction } from "./db";

export interface MonthSummary {
  income: number;
  expense: number;
  /** Spending per category */
  byCat: Map<number, number>;
  totalLimit: number;
}

export function summarize(txs: Transaction[], budgets: Budget[]): MonthSummary {
  let income = 0;
  let expense = 0;
  const byCat = new Map<number, number>();
  for (const t of txs) {
    if (t.type === "income") income += t.amount;
    else {
      expense += t.amount;
      byCat.set(t.categoryId, (byCat.get(t.categoryId) ?? 0) + t.amount);
    }
  }
  const totalLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
  return { income, expense, byCat, totalLimit };
}

/** "over" when exceeded; "warn" from 80%, or when spending ahead of the monthly pace. */
export function budgetTone(ratio: number, fast = false) {
  if (ratio > 1) return "over" as const;
  if (ratio >= 0.8 || fast) return "warn" as const;
  return "" as const;
}

export const byNewest = (a: Transaction, b: Transaction) =>
  b.date.localeCompare(a.date) || b.createdAt - a.createdAt;

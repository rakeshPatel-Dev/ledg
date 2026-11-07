import { useMemo } from "react";
import type { Space, Transaction } from "@ledg/shared";

import { useAllData } from "@/lib/queries";

export interface SpaceSummary {
  space: Space;
  balance: number;
  income: number;
  expense: number;
  monthIncome: number;
  monthExpense: number;
  transactionCount: number;
}

export interface AnalyticsData {
  spaces: Space[];
  transactions: Transaction[];
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  monthIncome: number;
  monthExpense: number;
  monthSpend: number;
  byCategory: { category: string; amount: number; count: number }[];
  byIncomeCategory: { category: string; amount: number; count: number }[];
  bySpace: SpaceSummary[];
  loading: boolean;
  fetching: boolean;
  error: unknown;
  refetch: () => void;
}

function currentMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function useAnalytics(): AnalyticsData {
  const { spaces, transactions, loading, fetching, error, refetch } = useAllData();

  return useMemo(() => {
    const monthKeyNow = currentMonthKey();

    // Dues-linked rows are loan principal/settlement movements, not income or
    // spending. Keep them out of every P&L aggregate; `transactions` and
    // `transactionCount` still include them for history and empty states.
    const operatingTransactions = transactions.filter(
      (t) => t.source !== "dues"
    );

    const totalIncome = operatingTransactions.reduce(
      (sum, t) => (t.type === "income" ? sum + t.amount : sum),
      0
    );
    const totalExpense = operatingTransactions.reduce(
      (sum, t) => (t.type === "expense" ? sum + t.amount : sum),
      0
    );

    const monthTransactions = operatingTransactions.filter(
      (t) => currentMonthKey(new Date(t.date)) === monthKeyNow
    );
    const monthIncome = monthTransactions.reduce(
      (sum, t) => (t.type === "income" ? sum + t.amount : sum),
      0
    );
    const monthExpense = monthTransactions.reduce(
      (sum, t) => (t.type === "expense" ? sum + t.amount : sum),
      0
    );

    const categoryMap = new Map<
      string,
      { category: string; amount: number; count: number }
    >();
    const incomeCategoryMap = new Map<
      string,
      { category: string; amount: number; count: number }
    >();
    for (const t of operatingTransactions) {
      if (t.type === "expense") {
        const entry = categoryMap.get(t.category) ?? {
          category: t.category,
          amount: 0,
          count: 0,
        };
        entry.amount += t.amount;
        entry.count += 1;
        categoryMap.set(t.category, entry);
      } else if (t.type === "income") {
        const entry = incomeCategoryMap.get(t.category) ?? {
          category: t.category,
          amount: 0,
          count: 0,
        };
        entry.amount += t.amount;
        entry.count += 1;
        incomeCategoryMap.set(t.category, entry);
      }
    }
    const byCategory = [...categoryMap.values()].sort(
      (a, b) => b.amount - a.amount
    );
    const byIncomeCategory = [...incomeCategoryMap.values()].sort(
      (a, b) => b.amount - a.amount
    );

    // A failed transactions request means every balance is unknown, not zero.
    // Leave the per-space summaries empty so cards render placeholders instead
    // of Rs. 0.
    const bySpace = error ? [] : spaces.map((space) => {
      const spaceTx = transactions.filter((t) => t.spaceId === space.id);
      const spaceOperatingTx = operatingTransactions.filter(
        (t) => t.spaceId === space.id
      );
      const spaceMonthTx = monthTransactions.filter((t) => t.spaceId === space.id);
      const income = spaceOperatingTx.reduce(
        (sum, t) => (t.type === "income" ? sum + t.amount : sum),
        0
      );
      const expense = spaceOperatingTx.reduce(
        (sum, t) => (t.type === "expense" ? sum + t.amount : sum),
        0
      );
      const spaceMonthIncome = spaceMonthTx.reduce(
        (sum, t) => (t.type === "income" ? sum + t.amount : sum),
        0
      );
      const spaceMonthExpense = spaceMonthTx.reduce(
        (sum, t) => (t.type === "expense" ? sum + t.amount : sum),
        0
      );
      return {
        space,
        income,
        expense,
        monthIncome: spaceMonthIncome,
        monthExpense: spaceMonthExpense,
        balance: income - expense,
        transactionCount: spaceTx.length,
      };
    });

    return {
      spaces,
      transactions,
      totalBalance: totalIncome - totalExpense,
      totalIncome,
      totalExpense,
      monthIncome,
      monthExpense,
      monthSpend: monthExpense,
      byCategory,
      byIncomeCategory,
      bySpace,
      loading,
      fetching,
      error,
      refetch,
    };
  }, [spaces, transactions, loading, fetching, error, refetch]);
}

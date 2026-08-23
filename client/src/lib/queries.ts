import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type {
  PaginatedResult,
  Space,
  SpaceInput,
  SpaceUpdateInput,
  Transaction,
  TransactionInput,
  TransactionQuery,
  TransactionUpdateInput,
} from "@ledg/shared";

import { getApi, type AnalyticsPeriod } from "./api";

export const queryKeys = {
  spaces: ["spaces"] as const,
  space: (id: string) => ["spaces", id] as const,
  transactions: (spaceId: string, query: TransactionListQuery = {}) =>
    ["spaces", spaceId, "transactions", query] as const,
  allTransactions: (pageSize: number) =>
    ["transactions", "all", pageSize] as const,
  analyticsSummary: (
    spaceId: string,
    period: AnalyticsPeriod,
    dateFrom?: string,
    dateTo?: string
  ) => ["spaces", spaceId, "analytics", "summary", period, dateFrom, dateTo] as const,
  analyticsRecurring: (spaceId: string) =>
    ["spaces", spaceId, "analytics", "recurring"] as const,
  dashboardSummary: () => ["dashboard", "summary"] as const,
};

type TransactionListQuery = Omit<
  TransactionQuery,
  "page" | "pageSize"
> & {
  page?: number;
  pageSize?: number;
};

const transactionListKey = (spaceId: string) =>
  ["spaces", spaceId, "transactions"] as const;

type TransactionList = PaginatedResult<Transaction>;

function tempId() {
  return `temp-${crypto.randomUUID()}`;
}

function updateTransactionLists(
  client: QueryClient,
  spaceId: string,
  update: (items: Transaction[], total: number) => {
    items: Transaction[];
    total: number;
  }
) {
  client.setQueriesData<TransactionList>(
    { queryKey: transactionListKey(spaceId) },
    (old) => {
      if (!old) return old;
      const { items, total } = update(old.items, old.total);
      return { ...old, items, total };
    }
  );
}

function snapshotTransactionLists(client: QueryClient, spaceId: string) {
  return client.getQueriesData<TransactionList>({
    queryKey: transactionListKey(spaceId),
  });
}

function replaceInTransactionLists(
  client: QueryClient,
  spaceId: string,
  id: string,
  replacement: Transaction
) {
  client.setQueriesData<TransactionList>(
    { queryKey: transactionListKey(spaceId) },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        items: old.items.map((t) => (t.id === id ? replacement : t)),
      };
    }
  );
}

function restoreTransactionLists(
  client: QueryClient,
  previous: ReturnType<typeof snapshotTransactionLists>
) {
  for (const [key, data] of previous) {
    if (data !== undefined) {
      client.setQueryData<TransactionList>(key, data);
    } else {
      client.removeQueries({ queryKey: key, exact: true });
    }
  }
}

// ─── Spaces ───────────────────────────────────────────────────────────────────

export function useSpaces() {
  return useQuery({
    queryKey: queryKeys.spaces,
    queryFn: () => getApi().spaces.list(),
    staleTime: 60_000,
  });
}

export function useCreateSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SpaceInput) => getApi().spaces.create(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.spaces });
      const previous = queryClient.getQueryData<Space[]>(queryKeys.spaces);

      const now = new Date().toISOString();
      const optimistic: Space = {
        id: tempId(),
        ownerId: "",
        name: data.name,
        type: data.type,
        createdAt: now,
        updatedAt: now,
      };

      queryClient.setQueryData<Space[]>(queryKeys.spaces, (old) => [
        ...(old ?? []),
        optimistic,
      ]);

      return { previous, tempId: optimistic.id };
    },
    onSuccess: (real, _variables, context) => {
      queryClient.setQueryData<Space[]>(queryKeys.spaces, (old) =>
        (old ?? []).map((s) => (s.id === context.tempId ? real : s))
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces });
    },
    onError: (_error, _variables, context) => {
      if (context.previous !== undefined) {
        queryClient.setQueryData(queryKeys.spaces, context.previous);
      }
    },
  });
}

export function useUpdateSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SpaceUpdateInput }) =>
      getApi().spaces.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.spaces });
      const previous = queryClient.getQueryData<Space[]>(queryKeys.spaces);

      queryClient.setQueryData<Space[]>(queryKeys.spaces, (old) =>
        (old ?? []).map((s) =>
          s.id === id
            ? { ...s, ...data, updatedAt: new Date().toISOString() }
            : s
        )
      );

      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces });
    },
    onError: (_error, _variables, context) => {
      if (context.previous !== undefined) {
        queryClient.setQueryData(queryKeys.spaces, context.previous);
      }
    },
  });
}

export function useDeleteSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getApi().spaces.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.spaces });
      await queryClient.cancelQueries({ queryKey: transactionListKey(id) });

      const previousSpaces = queryClient.getQueryData<Space[]>(
        queryKeys.spaces
      );
      const previousTransactions = snapshotTransactionLists(queryClient, id);

      queryClient.setQueryData<Space[]>(queryKeys.spaces, (old) =>
        (old ?? []).filter((s) => s.id !== id)
      );
      queryClient.removeQueries({ queryKey: transactionListKey(id) });

      return { previousSpaces, previousTransactions };
    },
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: transactionListKey(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary() });
    },
    onError: (_error, _id, context) => {
      if (context.previousSpaces !== undefined) {
        queryClient.setQueryData(queryKeys.spaces, context.previousSpaces);
      }
      restoreTransactionLists(queryClient, context.previousTransactions);
    },
  });
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export function useTransactions(
  spaceId: string,
  query: TransactionListQuery = {}
) {
  return useQuery({
    queryKey: queryKeys.transactions(spaceId, query),
    queryFn: () => getApi().transactions.list(spaceId, query),
    enabled: !!spaceId,
    staleTime: 60_000,
  });
}

function invalidateTransactionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  spaceId: string
) {
  queryClient.invalidateQueries({
    queryKey: ["spaces", spaceId, "transactions"],
  });
  queryClient.invalidateQueries({
    queryKey: ["transactions"],
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ spaceId, data }: { spaceId: string; data: TransactionInput }) =>
      getApi().transactions.create(spaceId, data),
    onMutate: async ({ spaceId, data }) => {
      await queryClient.cancelQueries({
        queryKey: transactionListKey(spaceId),
      });
      await queryClient.cancelQueries({
        queryKey: ["transactions", "all"],
      });
      const previous = snapshotTransactionLists(queryClient, spaceId);

      const optimisticId = tempId();
      const now = new Date().toISOString();
      const optimistic: Transaction = {
        id: optimisticId,
        spaceId,
        category: data.category,
        type: data.type,
        amount: data.amount,
        note: data.note ?? "",
        date:
          typeof data.date === "string"
            ? data.date
            : data.date.toISOString(),
        tags: data.tags ?? [],
        paymentMethod: data.paymentMethod ?? null,
        createdAt: now,
        updatedAt: now,
      };

      updateTransactionLists(queryClient, spaceId, (items, total) => ({
        items: [optimistic, ...items],
        total: total + 1,
      }));

      queryClient.setQueriesData<{ items: Transaction[]; total: number }>(
        { queryKey: ["transactions", "all"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: [optimistic, ...old.items],
            total: old.total + 1,
          };
        }
      );

      return { previous, tempId: optimisticId };
    },
    onSuccess: (real, variables, context) => {
      replaceInTransactionLists(
        queryClient,
        variables.spaceId,
        context.tempId,
        real
      );
      queryClient.setQueriesData<{ items: Transaction[]; total: number }>(
        { queryKey: ["transactions", "all"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((t) => (t.id === context.tempId ? real : t)),
          };
        }
      );
      invalidateTransactionQueries(queryClient, variables.spaceId);
      queryClient.invalidateQueries({
        queryKey: ["spaces", variables.spaceId, "analytics"],
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary() });
    },
    onError: (_error, _variables, context) => {
      restoreTransactionLists(queryClient, context.previous);
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      spaceId,
      newSpaceId,
      id,
      data,
    }: {
      spaceId: string;
      newSpaceId: string;
      id: string;
      data: TransactionUpdateInput;
    }) =>
      getApi().transactions.update(
        newSpaceId,
        id,
        spaceId !== newSpaceId ? { ...data, fromSpaceId: spaceId } : data
      ),
    onMutate: async ({ spaceId, newSpaceId, id, data }) => {
      const moved = spaceId !== newSpaceId;

      await queryClient.cancelQueries({
        queryKey: transactionListKey(spaceId),
      });
      await queryClient.cancelQueries({
        queryKey: ["transactions", "all"],
      });
      const previous = snapshotTransactionLists(queryClient, spaceId);

      if (moved) {
        await queryClient.cancelQueries({
          queryKey: transactionListKey(newSpaceId),
        });
      }
      const previousNew = moved
        ? snapshotTransactionLists(queryClient, newSpaceId)
        : undefined;

      const dateStr =
        typeof data.date === "string"
          ? data.date
          : data.date
            ? data.date.toISOString()
            : undefined;

      // Find existing transaction to preserve fields
      const allTx = queryClient.getQueryData<{ items: Transaction[]; total: number }>(
        queryKeys.allTransactions(100)
      );
      const existingTx =
        previous.flatMap(([_, d]) => d?.items ?? []).find((t) => t.id === id) ??
        allTx?.items.find((t) => t.id === id);

      if (moved) {
        updateTransactionLists(queryClient, spaceId, (items, total) => ({
          items: items.filter((t) => t.id !== id),
          total: Math.max(0, total - 1),
        }));

        updateTransactionLists(queryClient, newSpaceId, (items, total) => ({
          items: [
            {
              ...(existingTx ?? {}),
              ...data,
              id,
              spaceId: newSpaceId,
              date: dateStr ?? existingTx?.date ?? new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as Transaction,
            ...items.filter((t) => t.id !== id),
          ],
          total: total + 1,
        }));
      } else {
        updateTransactionLists(queryClient, spaceId, (items, total) => ({
          items: items.map((t) =>
            t.id === id
              ? {
                  ...t,
                  ...data,
                  date: dateStr ?? t.date,
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
          total,
        }));
      }

      // Optimistically update allTransactions
      queryClient.setQueriesData<{ items: Transaction[]; total: number }>(
        { queryKey: ["transactions", "all"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((t) =>
              t.id === id
                ? {
                    ...t,
                    ...data,
                    spaceId: newSpaceId,
                    date: dateStr ?? t.date,
                    updatedAt: new Date().toISOString(),
                  }
                : t
            ),
          };
        }
      );

      return { previous, previousNew, moved };
    },
    onSuccess: (_data, variables) => {
      invalidateTransactionQueries(queryClient, variables.spaceId);
      queryClient.invalidateQueries({
        queryKey: ["spaces", variables.spaceId, "analytics"],
      });
      if (variables.newSpaceId !== variables.spaceId) {
        invalidateTransactionQueries(queryClient, variables.newSpaceId);
        queryClient.invalidateQueries({
          queryKey: ["spaces", variables.newSpaceId, "analytics"],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary() });
    },
    onError: (_error, _variables, context) => {
      restoreTransactionLists(queryClient, context.previous);
      if (context.moved && context.previousNew) {
        restoreTransactionLists(queryClient, context.previousNew);
      }
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useDeleteTransaction(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getApi().transactions.remove(spaceId, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: transactionListKey(spaceId),
      });
      await queryClient.cancelQueries({
        queryKey: ["transactions", "all"],
      });
      const previous = snapshotTransactionLists(queryClient, spaceId);

      updateTransactionLists(queryClient, spaceId, (items, total) => ({
        items: items.filter((t) => t.id !== id),
        total: Math.max(0, total - 1),
      }));

      queryClient.setQueriesData<{ items: Transaction[]; total: number }>(
        { queryKey: ["transactions", "all"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.filter((t) => t.id !== id),
            total: Math.max(0, old.total - 1),
          };
        }
      );

      return { previous };
    },
    onSuccess: () => {
      invalidateTransactionQueries(queryClient, spaceId);
      queryClient.invalidateQueries({
        queryKey: ["spaces", spaceId, "analytics"],
      });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary() });
    },
    onError: (_error, _id, context) => {
      restoreTransactionLists(queryClient, context.previous);
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

// ─── Aggregated Data (for hooks that need all raw transactions client-side) ───

export interface AggregatedData {
  spaces: Space[];
  transactions: Transaction[];
  loading: boolean;
  error: unknown;
}

export function useAllData(): AggregatedData {
  const spacesQuery = useSpaces();

  const transactionsQuery = useQuery({
    queryKey: queryKeys.allTransactions(100),
    queryFn: () => getApi().transactions.listAll(100),
    staleTime: 60_000,
    enabled: !!spacesQuery.data,
  });

  return {
    spaces: spacesQuery.data ?? [],
    transactions: transactionsQuery.data?.items ?? [],
    loading: spacesQuery.isLoading || transactionsQuery.isLoading,
    error: spacesQuery.error ?? transactionsQuery.error,
  };
}

// ─── Server-computed Analytics Hooks ─────────────────────────────────────────

export function useAnalyticsSummary(
  spaceId: string,
  period: AnalyticsPeriod = "month",
  dateFrom?: string,
  dateTo?: string
) {
  return useQuery({
    queryKey: queryKeys.analyticsSummary(spaceId, period, dateFrom, dateTo),
    queryFn: () => getApi().analytics.summary(spaceId, period, dateFrom, dateTo),
    enabled: !!spaceId,
    staleTime: 60_000,
  });
}

export function useAnalyticsRecurring(spaceId: string) {
  return useQuery({
    queryKey: queryKeys.analyticsRecurring(spaceId),
    queryFn: () => getApi().analytics.recurring(spaceId),
    enabled: !!spaceId,
    staleTime: 60_000,
  });
}

// ─── Dashboard Hook ──────────────────────────────────────────────────────────

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboardSummary(),
    queryFn: () => getApi().dashboard.summary(),
    staleTime: 5 * 60_000, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

export type { Space, SpaceInput, SpaceUpdateInput, Transaction };

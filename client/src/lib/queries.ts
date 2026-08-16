import {
  useMutation,
  useQueries,
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
  analyticsSummary: (
    spaceId: string,
    period: AnalyticsPeriod,
    dateFrom?: string,
    dateTo?: string
  ) => ["spaces", spaceId, "analytics", "summary", period, dateFrom, dateTo] as const,
  analyticsTrends: (
    spaceId: string,
    period: AnalyticsPeriod,
    dateFrom?: string,
    dateTo?: string
  ) => ["spaces", spaceId, "analytics", "trends", period, dateFrom, dateTo] as const,
  analyticsRecurring: (spaceId: string) =>
    ["spaces", spaceId, "analytics", "recurring"] as const,
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

      return { previous, tempId: optimisticId };
    },
    onSuccess: (real, variables, context) => {
      replaceInTransactionLists(
        queryClient,
        variables.spaceId,
        context.tempId,
        real
      );
      invalidateTransactionQueries(queryClient, variables.spaceId);
      queryClient.invalidateQueries({
        queryKey: ["spaces", variables.spaceId, "analytics"],
      });
    },
    onError: (_error, _variables, context) => {
      restoreTransactionLists(queryClient, context.previous);
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      spaceId,
      id,
      data,
    }: {
      spaceId: string;
      id: string;
      data: TransactionUpdateInput;
    }) => getApi().transactions.update(spaceId, id, data),
    onMutate: async ({ spaceId, id, data }) => {
      await queryClient.cancelQueries({
        queryKey: transactionListKey(spaceId),
      });
      const previous = snapshotTransactionLists(queryClient, spaceId);

      updateTransactionLists(queryClient, spaceId, (items, total) => ({
        items: items.map((t) =>
          t.id === id
            ? {
                ...t,
                ...data,
                date:
                  typeof data.date === "string"
                    ? data.date
                    : data.date
                      ? data.date.toISOString()
                      : t.date,
                updatedAt: new Date().toISOString(),
              }
            : t
        ),
        total,
      }));

      return { previous };
    },
    onSuccess: (_data, variables) => {
      invalidateTransactionQueries(queryClient, variables.spaceId);
      queryClient.invalidateQueries({
        queryKey: ["spaces", variables.spaceId, "analytics"],
      });
    },
    onError: (_error, _variables, context) => {
      restoreTransactionLists(queryClient, context.previous);
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
      const previous = snapshotTransactionLists(queryClient, spaceId);

      updateTransactionLists(queryClient, spaceId, (items, total) => ({
        items: items.filter((t) => t.id !== id),
        total: Math.max(0, total - 1),
      }));

      return { previous };
    },
    onSuccess: () => {
      invalidateTransactionQueries(queryClient, spaceId);
      queryClient.invalidateQueries({
        queryKey: ["spaces", spaceId, "analytics"],
      });
    },
    onError: (_error, _id, context) => {
      restoreTransactionLists(queryClient, context.previous);
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
  const spaceIds = (spacesQuery.data ?? []).map((s) => s.id);

  const transactionQueries = useQueries({
    queries: spaceIds.map((id) => ({
      queryKey: queryKeys.transactions(id, { pageSize: 100 }),
      queryFn: () => getApi().transactions.list(id, { pageSize: 100 }),
      staleTime: 60_000,
    })),
  });

  const loading =
    spacesQuery.isLoading || transactionQueries.some((q) => q.isLoading);

  const transactions = transactionQueries.flatMap((q) => q.data?.items ?? []);

  return {
    spaces: spacesQuery.data ?? [],
    transactions,
    loading,
    error: spacesQuery.error ?? transactionQueries.find((q) => q.error)?.error,
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

export function useAnalyticsTrends(
  spaceId: string,
  period: AnalyticsPeriod = "month",
  dateFrom?: string,
  dateTo?: string
) {
  return useQuery({
    queryKey: queryKeys.analyticsTrends(spaceId, period, dateFrom, dateTo),
    queryFn: () => getApi().analytics.trends(spaceId, period, dateFrom, dateTo),
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

export type { Space, SpaceInput, SpaceUpdateInput, Transaction };

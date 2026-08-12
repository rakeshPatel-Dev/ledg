import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  Space,
  SpaceInput,
  SpaceUpdateInput,
  Transaction,
  TransactionInput,
  TransactionQuery,
  TransactionUpdateInput,
} from "@ledg/shared";

import { getApi } from "./api";

export const queryKeys = {
  spaces: ["spaces"] as const,
  space: (id: string) => ["spaces", id] as const,
  transactions: (spaceId: string, query: TransactionListQuery = {}) =>
    ["spaces", spaceId, "transactions", query] as const,
};

type TransactionListQuery = Omit<
  TransactionQuery,
  "page" | "pageSize"
> & {
  page?: number;
  pageSize?: number;
};

export function useSpaces() {
  return useQuery({
    queryKey: queryKeys.spaces,
    queryFn: () => getApi().spaces.list(),
  });
}

export function useCreateSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SpaceInput) => getApi().spaces.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces });
    },
  });
}

export function useUpdateSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SpaceUpdateInput }) =>
      getApi().spaces.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces });
    },
  });
}

export function useDeleteSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getApi().spaces.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces });
    },
  });
}

export function useTransactions(
  spaceId: string,
  query: TransactionListQuery = {}
) {
  return useQuery({
    queryKey: queryKeys.transactions(spaceId, query),
    queryFn: () => getApi().transactions.list(spaceId, query),
    enabled: !!spaceId,
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
    onSuccess: (_data, variables) => {
      invalidateTransactionQueries(queryClient, variables.spaceId);
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
    onSuccess: (_data, variables) => {
      invalidateTransactionQueries(queryClient, variables.spaceId);
    },
  });
}

export function useDeleteTransaction(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getApi().transactions.remove(spaceId, id),
    onSuccess: () => {
      invalidateTransactionQueries(queryClient, spaceId);
    },
  });
}

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

export function useAnalytics() {
  const spacesQuery = useSpaces();
  const spaceIds = (spacesQuery.data ?? []).map((s) => s.id);

  const transactionQueries = useQueries({
    queries: spaceIds.map((id) => ({
      queryKey: queryKeys.transactions(id, { pageSize: 100 }),
      queryFn: () => getApi().transactions.list(id, { pageSize: 100 }),
    })),
  });

  return {
    spaces: spacesQuery.data ?? [],
    transactions: transactionQueries.flatMap((q) => q.data?.items ?? []),
    loading:
      spacesQuery.isLoading || transactionQueries.some((q) => q.isLoading),
    error: spacesQuery.error ?? transactionQueries.find((q) => q.error)?.error,
  };
}

export type { Space, SpaceInput, SpaceUpdateInput, Transaction };

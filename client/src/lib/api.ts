import type {
  ApiResponse,
  PaginatedResult,
  Space,
  SpaceInput,
  SpaceUpdateInput,
  Transaction,
  TransactionInput,
  TransactionQuery,
  TransactionUpdateInput,
} from "@ledg/shared";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

type TransactionListQuery = Omit<TransactionQuery, "page" | "pageSize"> & {
  page?: number;
  pageSize?: number;
};

export class ApiError extends Error {
  status: number;
  errors: string[];

  constructor(status: number, message: string, errors: string[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

type TokenProvider = () => Promise<string | null>;

// ─── Analytics Types ──────────────────────────────────────────────────────────

export type AnalyticsPeriod = "today" | "month" | "3months" | "year" | "all" | "custom";

export interface AnalyticsSummary {
  period: AnalyticsPeriod;
  current: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    transactionCount: number;
  };
  previous: {
    totalIncome: number;
    totalExpense: number;
  };
  deltas: {
    expense: number | null;
    income: number | null;
  };
  byExpenseCategory: { category: string; amount: number; count: number }[];
  byIncomeCategory: { category: string; amount: number; count: number }[];
  insights: string[];
}

export interface TrendPoint {
  date: string;
  income: number;
  expense: number;
}

export interface AnalyticsTrends {
  granularity: "daily" | "monthly";
  data: TrendPoint[];
}

export interface RecurringGroup {
  key: string;
  category: string;
  note: string;
  amount: number;
  count: number;
  totalSpent: number;
  lastDate: string;
}

export function createApi(tokenProvider: TokenProvider) {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await tokenProvider();
    const headers = new Headers(init?.headers);
    headers.set("Content-Type", "application/json");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });

    const body = (await response.json().catch(() => null)) as
      | ApiResponse<T>
      | null;

    if (!response.ok || !body?.success) {
      const message =
        (body && "message" in body ? body.message : undefined) ??
        `Request failed with ${response.status}`;
      const errors = body && "errors" in body ? body.errors : [];
      throw new ApiError(response.status, message, errors);
    }

    return body.data;
  }

  return {
    spaces: {
      list: () =>
        request<{ spaces: Space[] }>("/spaces").then((r) => r.spaces),
      create: (data: SpaceInput) =>
        request<{ space: Space }>("/spaces", {
          method: "POST",
          body: JSON.stringify(data),
        }).then((r) => r.space),
      update: (id: string, data: SpaceUpdateInput) =>
        request<{ space: Space }>(`/spaces/${id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        }).then((r) => r.space),
      remove: (id: string) =>
        request<{ id: string }>(`/spaces/${id}`, {
          method: "DELETE",
        }).then((r) => r.id),
    },
    transactions: {
      list: (spaceId: string, query: TransactionListQuery = {}) => {
        const params = new URLSearchParams();
        if (query.category) params.set("category", query.category);
        if (query.type) params.set("type", query.type);
        if (query.dateFrom) params.set("dateFrom", query.dateFrom);
        if (query.dateTo) params.set("dateTo", query.dateTo);
        if (query.keyword) params.set("keyword", query.keyword);
        if (query.page) params.set("page", String(query.page));
        if (query.pageSize) params.set("pageSize", String(query.pageSize));
        const qs = params.toString();
        return request<PaginatedResult<Transaction>>(
          `/spaces/${spaceId}/transactions${qs ? `?${qs}` : ""}`
        );
      },
      create: (spaceId: string, data: TransactionInput) =>
        request<{ transaction: Transaction }>(
          `/spaces/${spaceId}/transactions`,
          {
            method: "POST",
            body: JSON.stringify(data),
          }
        ).then((r) => r.transaction),
      update: (
        spaceId: string,
        id: string,
        data: TransactionUpdateInput
      ) =>
        request<{ transaction: Transaction }>(
          `/spaces/${spaceId}/transactions/${id}`,
          {
            method: "PUT",
            body: JSON.stringify(data),
          }
        ).then((r) => r.transaction),
      remove: (spaceId: string, id: string) =>
        request<{ id: string }>(
          `/spaces/${spaceId}/transactions/${id}`,
          {
            method: "DELETE",
          }
        ).then((r) => r.id),
    },
    analytics: {
      summary: (
        spaceId: string,
        period: AnalyticsPeriod = "month",
        dateFrom?: string,
        dateTo?: string
      ) => {
        const params = new URLSearchParams({ period });
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
        return request<AnalyticsSummary>(
          `/spaces/${spaceId}/analytics/summary?${params.toString()}`
        );
      },
      trends: (
        spaceId: string,
        period: AnalyticsPeriod = "month",
        dateFrom?: string,
        dateTo?: string
      ) => {
        const params = new URLSearchParams({ period });
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
        return request<AnalyticsTrends>(
          `/spaces/${spaceId}/analytics/trends?${params.toString()}`
        );
      },
      recurring: (spaceId: string, minCount = 2) =>
        request<RecurringGroup[]>(
          `/spaces/${spaceId}/analytics/recurring?minCount=${minCount}`
        ),
    },
  };
}

export type Api = ReturnType<typeof createApi>;

let apiInstance: Api | null = null;
let currentTokenProvider: TokenProvider | null = null;

export function getApi(): Api {
  if (!currentTokenProvider || !apiInstance) {
    throw new Error("API not initialised. Call initApi first.");
  }
  return apiInstance;
}

export function initApi(tokenProvider: TokenProvider) {
  currentTokenProvider = tokenProvider;
  apiInstance = createApi(tokenProvider);
}

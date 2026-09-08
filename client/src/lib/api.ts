import type {
  ApiResponse,
  Debt,
  DebtCreateInput,
  DebtSettlement,
  DebtSettlementInput,
  DuesQuery,
  DuesSummary,
  InvitationPreview,
  NotificationItem,
  NotificationPreference,
  PaginatedResult,
  Space,
  SpaceInput,
  SpaceInvitation,
  SpaceMember,
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

export interface RecurringGroup {
  key: string;
  category: string;
  note: string;
  amount: number;
  count: number;
  totalSpent: number;
  lastDate: string;
}

export interface DashboardSummary {
  totalBalance: number;
  monthIncome: number;
  monthSpend: number;
  byCategory: { category: string; amount: number; count: number }[];
  byIncomeCategory: { category: string; amount: number; count: number }[];
  byPaymentMethod: { method: string; amount: number; count: number }[];
  recentTransactions: Transaction[];
  transactionCount: number;
}

export interface AllTransactionsFilter {
  type?: string;
  spaceId?: string;
  keyword?: string;
}

export function createApi() {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    headers.set("Content-Type", "application/json");

    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? ((await response.json().catch(() => null)) as ApiResponse<T> | null)
      : null;

    if (!response.ok || !body?.success) {
      // Non-JSON bodies (e.g. HTML 502 pages from the host) get a
      // status-based message instead of a parse failure.
      const message =
        (body && "message" in body ? body.message : undefined) ??
        `Request failed with ${response.status} ${response.statusText}`.trim();
      const errors = body && "errors" in body ? body.errors : [];
      throw new ApiError(response.status, message, errors);
    }

    return body.data;
  }

  return {
    spaces: {
      list: () =>
        request<{ spaces: Space[] }>("/spaces").then((r) => r.spaces),
      get: (id: string) =>
        request<{ space: Space }>(`/spaces/${id}`).then((r) => r.space),
      create: (data: SpaceInput, idempotencyKey?: string) =>
        request<{ space: Space }>("/spaces", {
          method: "POST",
          headers: idempotencyKey
            ? { "Idempotency-Key": idempotencyKey }
            : undefined,
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
      getMembers: (id: string) =>
        request<{ members: SpaceMember[] }>(`/spaces/${id}/members`).then(
          (r) => r.members
        ),
      getInvitations: (id: string) =>
        request<{ invitations: SpaceInvitation[] }>(
          `/spaces/${id}/invitations`
        ).then((r) => r.invitations),
      inviteMember: (id: string, identifier: string) =>
        request<{ invitation: SpaceInvitation }>(`/spaces/${id}/members/invite`, {
          method: "POST",
          body: JSON.stringify({ identifier }),
        }).then((r) => r.invitation),
      removeMember: (id: string, userId: string) =>
        request<{ success: boolean; memberId: string }>(
          `/spaces/${id}/members/${userId}`,
          {
            method: "DELETE",
          }
        ),
      transferOwnership: (id: string, userId: string) =>
        request<{ space: Space }>(`/spaces/${id}/transfer-ownership`, {
          method: "POST",
          body: JSON.stringify({ userId }),
        }).then((r) => r.space),
      leave: (id: string) =>
        request<{ success: boolean; spaceId: string }>(`/spaces/${id}/leave`, {
          method: "POST",
        }),
    },
    invitations: {
      getPending: () =>
        request<{ invitations: SpaceInvitation[] }>("/invitations/pending").then(
          (r) => r.invitations
        ),
      getPreview: (token: string) =>
        request<{ preview: InvitationPreview }>(
          `/invitations/by-token/${token}`
        ).then((r) => r.preview),
      acceptByToken: (token: string) =>
        request<{ success: boolean; spaceId: string; spaceName: string }>(
          "/invitations/by-token/accept",
          {
            method: "POST",
            body: JSON.stringify({ token }),
          }
        ),
      rejectByToken: (token: string) =>
        request<{ success: boolean }>("/invitations/by-token/reject", {
          method: "POST",
          body: JSON.stringify({ token }),
        }),
      accept: (id: string) =>
        request<{ success: boolean; spaceId: string; spaceName: string }>(
          `/invitations/${id}/accept`,
          {
            method: "POST",
          }
        ),
      reject: (id: string) =>
        request<{ success: boolean }>(`/invitations/${id}/reject`, {
          method: "POST",
        }),
      resend: (id: string) =>
        request<{ invitation: SpaceInvitation; emailSent: boolean }>(
          `/invitations/${id}/resend`,
          {
            method: "POST",
          }
        ),
      cancel: (id: string) =>
        request<{ success: boolean; id: string }>(`/invitations/${id}`, {
          method: "DELETE",
        }),
    },
    notifications: {
      list: (page = 1, pageSize = 20) =>
        request<{
          items: NotificationItem[];
          total: number;
          unreadCount: number;
          page: number;
          pageSize: number;
          totalPages: number;
        }>(`/notifications?page=${page}&pageSize=${pageSize}`),
      markRead: (id: string) =>
        request<{ notification: NotificationItem }>(
          `/notifications/${id}/read`,
          {
            method: "PATCH",
          }
        ).then((r) => r.notification),
      markAllRead: () =>
        request<{ updatedCount: number }>("/notifications/read-all", {
          method: "POST",
        }),
      getPreferences: () =>
        request<{ preferences: NotificationPreference }>(
          "/me/notification-preferences"
        ).then((r) => r.preferences),
      updatePreferences: (data: Partial<NotificationPreference>) =>
        request<{ preferences: NotificationPreference }>(
          "/me/notification-preferences",
          {
            method: "PUT",
            body: JSON.stringify(data),
          }
        ).then((r) => r.preferences),
    },
    transactions: {

      listAll: (page = 1, pageSize = 20, filters: AllTransactionsFilter = {}) => {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (filters.type && filters.type !== "all") params.set("type", filters.type);
        if (filters.spaceId && filters.spaceId !== "all") {
          params.set("spaceId", filters.spaceId);
        }
        if (filters.keyword) params.set("keyword", filters.keyword);
        return request<PaginatedResult<Transaction>>(
          `/transactions/all?${params.toString()}`
        );
      },
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
      recurring: (spaceId: string, minCount = 2) =>
        request<RecurringGroup[]>(
          `/spaces/${spaceId}/analytics/recurring?minCount=${minCount}`
        ),
    },
    dashboard: {
      summary: () => request<DashboardSummary>("/dashboard/summary"),
    },
    dues: {
      summary: () => request<DuesSummary>("/dues/summary"),
      list: (query: Partial<DuesQuery> = {}) => {
        const params = new URLSearchParams();
        if (query.status) params.set("status", query.status);
        if (query.direction) params.set("direction", query.direction);
        if (query.person) params.set("person", query.person);
        if (query.page) params.set("page", String(query.page));
        if (query.pageSize) params.set("pageSize", String(query.pageSize));
        const qs = params.toString();
        return request<PaginatedResult<Debt>>(`/dues${qs ? `?${qs}` : ""}`);
      },
      get: (id: string) =>
        request<{ due: Debt }>(`/dues/${id}`).then((r) => r.due),
      create: (data: DebtCreateInput) =>
        request<{ due: Debt }>("/dues", {
          method: "POST",
          body: JSON.stringify(data),
        }).then((r) => r.due),
      settle: (id: string, data: DebtSettlementInput) =>
        request<{ settlement: DebtSettlement; debt: Debt }>(`/dues/${id}/settle`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
      undoSettlement: (id: string, settlementId: string) =>
        request<{ due: Debt }>(`/dues/${id}/settlements/${settlementId}`, {
          method: "DELETE",
        }).then((r) => r.due),
      remove: (id: string) =>
        request<{ id: string }>(`/dues/${id}`, {
          method: "DELETE",
        }).then((r) => r.id),
    },
    me: {
      getProvider: () =>
        request<{ provider: string }>("/me/provider"),
      getProfile: () =>
        request<{
          name: string;
          fullName: string;
          username: string | null;
          email: string;
          image: string | null;
          emailVerified: boolean;
          provider: string;
          joinedAt: string;
        }>("/me/profile"),
      updateProfile: (data: { name?: string; username?: string }) =>
        request<{ name: string; username: string | null }>("/me/profile", {
          method: "PATCH",
          body: JSON.stringify(data),
        }),
      checkUsernameAvailable: (username: string, signal?: AbortSignal) =>
        request<{ available: boolean; reason?: string }>(
          `/me/username/check?u=${encodeURIComponent(username)}`,
          { signal }
        ),
      updateUsername: (username: string) =>
        request<{ username: string }>("/me/username", {
          method: "PATCH",
          body: JSON.stringify({ username }),
        }),
      updateEmail: (email: string) =>
        request<{ email: string }>("/me/email", {
          method: "PATCH",
          body: JSON.stringify({ email }),
        }).then((r) => r.email),
      changePassword: (currentPassword: string, newPassword: string) =>
        request<{ success: true }>("/me/password", {
          method: "POST",
          body: JSON.stringify({ currentPassword, newPassword }),
        }),
    },
  };
}

export type Api = ReturnType<typeof createApi>;

let apiInstance: Api | null = null;

export function getApi(): Api {
  if (!apiInstance) {
    apiInstance = createApi();
  }
  return apiInstance;
}

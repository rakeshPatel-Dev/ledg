import type {
  DebtDirection,
  DebtStatus,
  PaymentMethod,
  SpaceType,
  TransactionSource,
  TransactionType,
} from "../enums/index.js";

export interface User {
  id: string;
  betterAuthId: string;
  email: string;
  name: string;
  username: string | null;
  fullName: string;
  image: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Space {
  id: string;
  ownerId: string;
  name: string;
  type: SpaceType;
  monthlyBudget?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  spaceId: string;
  category: string;
  type: TransactionType;
  amount: number;
  note: string;
  date: string;
  paymentMethod: PaymentMethod | null;
  source: TransactionSource;
  createdAt: string;
  updatedAt: string;
}

export interface DebtCounterparty {
  name: string;
  phone?: string;
  linkedUserId?: string | null;
}

export interface DebtSettlement {
  id: string;
  debtId: string;
  userId: string;
  spaceId: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod | null;
  note: string;
  transactionId?: string;
  createdAt: string;
}

export interface Debt {
  id: string;
  userId: string;
  spaceId: string;
  direction: DebtDirection;
  counterparty: DebtCounterparty;
  principal: number;
  date: string;
  dueDate?: string | null;
  note: string;
  transactionId?: string;
  status: DebtStatus;
  settledAmount: number;
  settlements?: DebtSettlement[];
  createdAt: string;
  updatedAt: string;
}

export interface PersonDuesSummary {
  name: string;
  phone?: string;
  owedToMe: number;
  iOwe: number;
  net: number; // positive = they owe me, negative = I owe them
  activeCount: number;
}

export interface DuesSummary {
  owedToMe: number;
  iOwe: number;
  net: number;
  overdueCount: number;
  activeCount: number;
  byPerson: PersonDuesSummary[];
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  errors: string[];
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

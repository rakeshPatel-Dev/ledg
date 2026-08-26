import type {
  PaymentMethod,
  SpaceType,
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
  createdAt: string;
  updatedAt: string;
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

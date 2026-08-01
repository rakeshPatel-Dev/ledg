import type {
  CategoryType,
  PaymentMethod,
  SpaceType,
  TransactionType,
} from "../enums/index.js";

export interface User {
  id: string;
  clerkId: string;
  email: string;
  name: string;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Space {
  id: string;
  ownerId: string;
  name: string;
  type: SpaceType;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  spaceId: string;
  name: string;
  icon: string | null;
  color: string | null;
  type: CategoryType;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  spaceId: string;
  categoryId: string | null;
  type: TransactionType;
  amount: number;
  note: string;
  date: string;
  tags: string[];
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

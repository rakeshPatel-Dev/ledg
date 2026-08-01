export const SPACE_TYPES = ["personal", "family", "trip", "business"] as const;
export type SpaceType = (typeof SPACE_TYPES)[number];

export const CATEGORY_TYPES = ["expense", "income"] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export const TRANSACTION_TYPES = ["expense", "income", "transfer"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const PAYMENT_METHODS = [
  "cash",
  "card",
  "bank_transfer",
  "upi",
  "other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

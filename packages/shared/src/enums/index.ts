export const SPACE_TYPES = ["personal", "family", "trip", "business"] as const;
export type SpaceType = (typeof SPACE_TYPES)[number];

export const TRANSACTION_TYPES = ["expense", "income", "transfer"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const PAYMENT_METHODS = [
  "cash",
  "card",
  "bank_transfer",
  "other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  bank_transfer: "Bank Transfer",
  other: "Other",
};

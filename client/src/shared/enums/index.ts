export const SPACE_TYPES = ["personal", "family", "trip", "business"] as const;
export type SpaceType = (typeof SPACE_TYPES)[number];

export const TRANSACTION_TYPES = ["expense", "income"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const PAYMENT_METHODS = [
  "cash",
  "card",
  "bank_transfer",
  "wallet",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  bank_transfer: "Bank",
  wallet: "Wallet",
};

export const TRANSACTION_SOURCES = ["manual", "dues"] as const;
export type TransactionSource = (typeof TRANSACTION_SOURCES)[number];

export const DEBT_DIRECTIONS = ["lent", "borrowed"] as const;
export type DebtDirection = (typeof DEBT_DIRECTIONS)[number];

export const DEBT_STATUSES = ["open", "partially_settled", "settled"] as const;
export type DebtStatus = (typeof DEBT_STATUSES)[number];

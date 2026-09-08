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

export const SPACE_ROLES = ["owner", "member"] as const;
export type SpaceRole = (typeof SPACE_ROLES)[number];

export const INVITATION_STATUSES = [
  "pending",
  "accepting",
  "accepted",
  "rejected",
  "canceled",
] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  "space_invite",
  "invite_accepted",
  "invite_rejected",
  "member_joined",
  "member_left",
  "member_removed",
  "ownership_transferred",
  "transaction_added",
  "transaction_modified",
  "space_deleted",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const TRANSACTION_ACTIVITY_MODES = [
  "realtime",
  "daily_digest",
  "off",
] as const;
export type TransactionActivityMode = (typeof TRANSACTION_ACTIVITY_MODES)[number];


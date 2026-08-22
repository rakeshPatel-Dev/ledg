export const CURRENCIES = ["NPR", "USD", "EUR", "GBP", "INR"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "NPR";

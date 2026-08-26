export type Currency = "NPR";

export const DEFAULT_CURRENCY: Currency = "NPR";

export const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  "admin", "ledg", "api", "me", "null", "undefined", "support",
  "help", "system", "root", "anonymous", "user",
]);

import type { Location } from "react-router-dom";

export interface AuthRedirectState {
  from?: Pick<Location, "pathname" | "search" | "hash"> | null;
  email?: string;
}

/**
 * Where to send the user after sign-in or email verification.
 *
 * Invite links pass the current location through `state.from`; anything that
 * is not an internal path falls back to Home so an auth redirect can never
 * become an open redirect.
 */
export function getAuthRedirect(state: unknown): string {
  const from = (state as AuthRedirectState | null)?.from;
  if (!from?.pathname || !from.pathname.startsWith("/")) return "/";
  if (from.pathname.startsWith("//")) return "/";
  return `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`;
}

/** Invite pages pre-fill the invited email so the user does not retype it. */
export function getAuthEmail(state: unknown): string {
  return (state as AuthRedirectState | null)?.email ?? "";
}

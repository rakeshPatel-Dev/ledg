import { ApiError } from "./api";

const DEFAULT_MESSAGE = "Something went wrong. Please try again.";

/**
 * Turn a query error into something a person can read.
 *
 * API messages are written for humans, so they are safe to show. Transport
 * failures, HTML error pages and stack traces are not: they get replaced with
 * a plain-language message instead.
 */
export function getUserFacingError(
  error: unknown,
  fallback: string = DEFAULT_MESSAGE
): string {
  if (!error) return fallback;

  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Your session has expired. Sign in again to continue.";
    }
    if (error.status === 403) {
      return "You don't have access to this. Ask the space owner for permission.";
    }
    if (error.status === 404) {
      return "We couldn't find what you were looking for. It may have been deleted.";
    }
    if (error.status === 429) {
      return "Too many requests. Wait a moment and try again.";
    }
    if (error.status >= 500) {
      return "The server couldn't complete the request. Please try again.";
    }
    if (error.message && !looksTechnical(error.message)) {
      return error.message;
    }
    return fallback;
  }

  if (error instanceof TypeError) {
    return "Can't reach the server. Check your connection and try again.";
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return "The request was cancelled. Try again.";
  }

  if (error instanceof Error) {
    if (error.message && !looksTechnical(error.message)) {
      return error.message;
    }
    return fallback;
  }

  return fallback;
}

/** True when the error is likely a dropped connection rather than a bad response. */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (!(error instanceof Error)) return false;
  return /failed to fetch|networkerror|load failed|network request failed/i.test(
    error.message
  );
}

function looksTechnical(message: string): boolean {
  return /<!doctype|<html|stack trace|typeerror:|failed to fetch|networkerror|load failed|network request failed/i.test(
    message
  );
}

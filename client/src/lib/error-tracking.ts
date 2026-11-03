import * as Sentry from "@sentry/react";

/**
 * Optional browser error tracking.
 *
 * Inert unless `VITE_SENTRY_DSN` is present at build time. The DSN is a
 * public write-only key, so it is safe to ship in the bundle.
 */

let initialized = false;

export function initErrorTracking(): boolean {
  if (initialized) return true;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
  });

  initialized = true;
  return true;
}

export function captureException(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (!initialized) return;

  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}

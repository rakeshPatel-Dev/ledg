import * as Sentry from "@sentry/node";

/**
 * Optional error tracking.
 *
 * Nothing is sent unless `SENTRY_DSN` is set, so local dev and self-hosted
 * deployments stay silent by default. Initialisation happens at module load
 * (see `app.ts`) rather than inside `startLocalServer` so the Vercel entry
 * point picks it up too.
 */

let initialized = false;

export function initErrorTracking(): boolean {
  if (initialized) return true;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    // Errors only for now. Performance tracing can be enabled later by
    // setting tracesSampleRate.
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

/** Give Sentry a moment to deliver queued events before the process exits. */
export async function flushErrorTracking(timeoutMs = 2_000): Promise<void> {
  if (!initialized) return;
  await Sentry.flush(timeoutMs);
}

import type * as SentryTypes from "@sentry/node";

/**
 * Optional error tracking.
 *
 * Nothing is sent unless `SENTRY_DSN` is set, so local dev and self-hosted
 * deployments stay silent by default. Initialisation happens at module load
 * (see `app.ts`) rather than inside `startLocalServer` so the Vercel entry
 * point picks it up too.
 *
 * The SDK is imported dynamically: `@sentry/node` costs ~250ms of module
 * evaluation, which a cold serverless start pays even when no DSN is
 * configured. With no DSN the import never happens at all.
 */

type SentryModule = typeof SentryTypes;

/** Cap on errors held while the SDK is still loading. */
const MAX_BUFFERED = 20;

let sentry: SentryModule | null = null;
let enabled = false;
let initPromise: Promise<boolean> | null = null;
const buffered: Array<{ error: unknown; context?: Record<string, unknown> }> = [];

function send(error: unknown, context?: Record<string, unknown>): void {
  if (!sentry) return;
  sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    sentry!.captureException(error);
  });
}

export function initErrorTracking(): Promise<boolean> {
  if (initPromise) return initPromise;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    initPromise = Promise.resolve(false);
    return initPromise;
  }

  enabled = true;
  initPromise = import("@sentry/node")
    .then((mod) => {
      mod.init({
        dsn,
        environment: process.env.NODE_ENV ?? "development",
        // Errors only for now. Performance tracing can be enabled later by
        // setting tracesSampleRate.
        tracesSampleRate: 0,
      });
      sentry = mod;
      for (const item of buffered.splice(0)) send(item.error, item.context);
      return true;
    })
    .catch(() => false);

  return initPromise;
}

export function captureException(
  error: unknown,
  context?: Record<string, unknown>
): void {
  // No DSN was configured, so nothing is ever sent.
  if (!enabled) return;

  if (!sentry) {
    if (buffered.length < MAX_BUFFERED) buffered.push({ error, context });
    return;
  }

  send(error, context);
}

/** Give Sentry a moment to deliver queued events before the process exits. */
export async function flushErrorTracking(timeoutMs = 2_000): Promise<void> {
  if (!initPromise) return;
  await initPromise;
  if (!sentry) return;
  await sentry.flush(timeoutMs);
}

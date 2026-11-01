import { Redis } from "@upstash/redis";

/**
 * Shared-state store for cross-instance coordination (e.g. the notification
 * spam window, dashboard summary cache). Uses Upstash Redis which is a natural
 * fit for Vercel serverless — a REST client that needs no connection pooling.
 *
 * The client lazily builds from env; if the env vars are missing (e.g. local
 * dev without the workspace) it becomes null and callers must fall back to a
 * per-process store.
 */

/**
 * Redis is an optimisation, never a dependency. A hung or misconfigured
 * Upstash instance must not be able to stall an API request, so every call is
 * capped and retries are disabled. The default client behaviour is 5 retries
 * with exponential backoff, which can hold a request open for ~10 seconds —
 * that is how a cache outage turns into a 15-second dashboard load.
 *
 * The cap is 1s rather than something tighter because the *first* call in a
 * fresh process also pays DNS + TLS (~250-400ms on a cold serverless
 * instance). At 500ms that handshake regularly lost the race, so every cold
 * start logged a failure and skipped the cache. Warm calls land in ~50ms, and
 * the circuit breaker means a genuinely dead instance still only costs a
 * couple of timeouts before it is skipped for 30s.
 */
const REQUEST_TIMEOUT_MS = 1_000;

const restUrl = process.env.UPSTASH_REDIS_REST_URL;
const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis: Redis | null =
  restUrl && restToken
    ? new Redis({
        url: restUrl,
        token: restToken,
        enableTelemetry: false,
        signal: () => AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        retry: { retries: 0 },
      })
    : null;

/**
 * Pay the DNS + TLS cost once at boot instead of on the first real request.
 * Best-effort: a warmup failure is never fatal, the circuit breaker handles it.
 */
export async function warmRedis(): Promise<boolean> {
  if (!redis) return false;

  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

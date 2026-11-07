import type { Types } from "mongoose";

import { redis } from "../../config/redis.js";
import { logger } from "../../config/logger.js";

/**
 * Dashboard summary cache.
 *
 * The dashboard is the most frequently loaded view and its aggregation is the
 * most expensive read in the app. A short TTL removes the query entirely on
 * repeat loads while keeping the window where a missed invalidation can show
 * stale numbers bounded and small.
 *
 * When Upstash env vars are absent (local dev) every function degrades to a
 * no-op, so the DB path is always the fallback.
 *
 * A cache outage must never slow the app down. Individual calls are capped by
 * the client timeout in `config/redis.ts`; on top of that, repeated failures
 * open a circuit for a short window so we stop paying even that timeout on
 * every request.
 */

const KEY_PREFIX = "dash:v2:";
const TTL_SECONDS = 60;

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 30_000;

let consecutiveFailures = 0;
let disabledUntil = 0;

function circuitOpen(): boolean {
  return Date.now() < disabledUntil;
}

function recordSuccess(): void {
  consecutiveFailures = 0;
}

function recordFailure(error: unknown, operation: string): void {
  consecutiveFailures += 1;

  if (consecutiveFailures >= FAILURE_THRESHOLD) {
    disabledUntil = Date.now() + COOLDOWN_MS;
    consecutiveFailures = 0;
    logger.warn(
      { err: error, operation, cooldownMs: COOLDOWN_MS },
      "Dashboard cache circuit opened — falling back to the database"
    );
    return;
  }

  logger.warn({ err: error, operation }, "Dashboard cache operation failed");
}

export function dashboardCacheKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

export async function getCachedDashboard<T>(userId: string): Promise<T | null> {
  if (!redis || circuitOpen()) return null;

  try {
    const value = await redis.get<T>(dashboardCacheKey(userId));
    recordSuccess();
    return value;
  } catch (error) {
    recordFailure(error, "read");
    return null;
  }
}

export async function setCachedDashboard<T>(
  userId: string,
  data: T
): Promise<void> {
  if (!redis || circuitOpen()) return;

  try {
    await redis.set(dashboardCacheKey(userId), data, { ex: TTL_SECONDS });
    recordSuccess();
  } catch (error) {
    recordFailure(error, "write");
  }
}

/**
 * Drop cached dashboards for the given users. Call this on every write that
 * changes a total (transactions, dues, space membership).
 */
export async function invalidateDashboardCache(
  userIds: ReadonlyArray<string | Types.ObjectId>
): Promise<void> {
  if (!redis || circuitOpen() || userIds.length === 0) return;

  const keys = [...new Set(userIds.map((id) => String(id)))].map(
    dashboardCacheKey
  );

  try {
    await redis.del(...keys);
    recordSuccess();
  } catch (error) {
    recordFailure(error, "invalidate");
  }
}

import { Redis } from "@upstash/redis";

/**
 * Shared-state store for cross-instance coordination (e.g. the notification
 * spam window). Uses Upstash Redis which is a natural fit for Vercel
 * serverless — a REST client that needs no connection pooling.
 *
 * The client lazily builds from env; if the env vars are missing (e.g. local
 * dev without the workspace) it becomes null and callers must fall back to a
 * per-process store.
 */
const restUrl = process.env.UPSTASH_REDIS_REST_URL;
const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis: Redis | null =
  restUrl && restToken
    ? new Redis({ url: restUrl, token: restToken, enableTelemetry: false })
    : null;
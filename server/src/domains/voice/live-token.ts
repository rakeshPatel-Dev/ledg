import { z } from "zod";

import { ServiceUnavailableError } from "../../common/errors/index.js";
import { logger } from "../../config/logger.js";
import type { VoiceLiveToken } from "../../shared/index.js";

/**
 * Issues a short-lived, single-use token so the browser can open a Gemini Live
 * session without ever seeing the long-lived API key.
 *
 * The token only authenticates the WebSocket. The setup message (system prompt
 * and tools) is still sent by the client because the API's
 * `liveConnectConstraints` field is not available on this key yet. The token is
 * therefore short-lived and rate-limited, and every write still goes through
 * the normal authenticated API after a visible confirmation.
 */

const AUTH_TOKENS_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/auth_tokens";
const DEFAULT_MODEL = "gemini-3.8-live";
const REQUEST_TIMEOUT_MS = 8_000;
// Google caps audio-only sessions at 15 minutes. Ten leaves room for a slow
// connection and is far longer than a one-shot transaction entry needs.
const SESSION_TTL_MS = 10 * 60_000;
// The token must be used to start a session within a minute of being issued.
const START_TTL_MS = 60_000;

const tokenResponseSchema = z.object({
  name: z.string().trim().min(1),
});

export function isVoiceLiveEnabled(): boolean {
  return process.env.VOICE_LIVE !== "off";
}

export function configuredLiveModel(): string {
  const raw = process.env.GEMINI_LIVE_MODEL?.trim() || DEFAULT_MODEL;
  // The model is interpolated into a URL path by the client. Keep the value to
  // the same safe character set as the text model configuration.
  return /^[a-zA-Z0-9._-]+$/.test(raw) ? raw : DEFAULT_MODEL;
}

/**
 * Returns a token or throws a 503. The client treats 503 as "use the browser
 * fallback", so this is an expected degradation, not a crash.
 */
export async function createLiveToken(): Promise<VoiceLiveToken> {
  if (!isVoiceLiveEnabled()) {
    throw new ServiceUnavailableError("Live voice is turned off.");
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new ServiceUnavailableError("Live voice is not configured.");
  }

  const now = Date.now();
  const expiresAt = new Date(now + SESSION_TTL_MS);

  let response: Response;
  try {
    response = await fetch(AUTH_TOKENS_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        uses: 1,
        expireTime: expiresAt.toISOString(),
        newSessionExpireTime: new Date(now + START_TTL_MS).toISOString(),
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    logger.warn(
      { error: error instanceof Error ? error.message : "unknown" },
      "Voice live: token request failed"
    );
    throw new ServiceUnavailableError("Live voice is unavailable.");
  }

  if (!response.ok) {
    // Do not log the response body: it can echo request metadata, and status
    // plus request timing is enough to diagnose quota or configuration issues.
    logger.warn({ status: response.status }, "Voice live: token endpoint rejected request");
    throw new ServiceUnavailableError("Live voice is unavailable.");
  }

  const parsed = tokenResponseSchema.safeParse(
    await response.json().catch(() => null)
  );
  if (!parsed.success) {
    logger.warn("Voice live: token response was not valid");
    throw new ServiceUnavailableError("Live voice is unavailable.");
  }

  return {
    token: parsed.data.name,
    model: configuredLiveModel(),
    expiresAt: expiresAt.toISOString(),
  };
}

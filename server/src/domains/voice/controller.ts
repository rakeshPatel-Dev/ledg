import type { Response } from "express";

import { asyncHandler } from "../../common/utils/async-handler.js";
import type { AuthRequest } from "../../common/middlewares/authenticate.js";
import { createLiveToken } from "./live-token.js";
import { handleVoiceAudioTurn, handleVoiceTurn } from "./service.js";
import { getSpeechClip } from "./tts.js";
import {
  validateVoiceAudioTurn,
  validateVoiceSpeech,
  validateVoiceTurn,
} from "./validator.js";

export const turn = asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = validateVoiceTurn(req.body);
  const data = await handleVoiceTurn(input);

  res.json({ success: true, data });
});

export const audio = asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = validateVoiceAudioTurn(req.body);
  const data = await handleVoiceAudioTurn(input);

  res.json({ success: true, data });
});

/**
 * Mints a short-lived token for a direct browser-to-Google Live session. The
 * long-lived API key stays on the server. No-store keeps the token out of any
 * shared cache.
 */
export const liveToken = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const data = await createLiveToken();

  res.setHeader("Cache-Control", "no-store");
  res.json({ success: true, data });
});

/**
 * Serves a spoken reply as audio bytes. A cache hit is a plain memory read, so
 * the browser can play the clip almost immediately; a miss waits for the
 * neural voice service. The client falls back to `speechSynthesis` on any
 * non-2xx response.
 */
export const speak = asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = validateVoiceSpeech(req.body);
  const clip = await getSpeechClip(input.text);

  if (!clip) {
    // Expected when the key is missing, quota is exhausted, or the provider is
    // down. Answer directly instead of routing an enhancement failure through
    // error tracking; the client silently falls back to the device voice.
    res.status(503).json({
      success: false,
      message: "Speech is unavailable. Using device voice.",
      errors: [],
    });
    return;
  }

  res.setHeader("Content-Type", clip.mimeType);
  res.setHeader("Content-Length", clip.audio.length);
  res.setHeader("Cache-Control", "private, max-age=86400");
  res.setHeader("X-Ledg-Voice-Cache", clip.cached ? "hit" : "miss");
  res.send(clip.audio);
});

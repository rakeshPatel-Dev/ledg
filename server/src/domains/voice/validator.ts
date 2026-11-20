import { z } from "zod";

import { BadRequestError } from "../../common/errors/index.js";
import { voiceAudioTurnInputSchema, voiceTurnInputSchema } from "../../shared/index.js";

const voiceSpeechInputSchema = z.object({
  // The UI never speaks more than a sentence; a hard cap keeps this endpoint
  // from becoming a general-purpose TTS proxy for an authenticated account.
  text: z.string().trim().min(1).max(320),
});

export function validateVoiceTurn(input: unknown) {
  const result = voiceTurnInputSchema.safeParse(input);

  if (!result.success) {
    throw new BadRequestError("Invalid voice request");
  }

  return result.data;
}

export function validateVoiceAudioTurn(input: unknown) {
  const result = voiceAudioTurnInputSchema.safeParse(input);

  if (!result.success) {
    throw new BadRequestError("Invalid voice recording");
  }

  return result.data;
}

export function validateVoiceSpeech(input: unknown) {
  const result = voiceSpeechInputSchema.safeParse(input);

  if (!result.success) {
    throw new BadRequestError("Invalid speech request");
  }

  return result.data;
}

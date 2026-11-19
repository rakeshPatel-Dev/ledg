import { BadRequestError } from "../../common/errors/index.js";
import { voiceAudioTurnInputSchema, voiceTurnInputSchema } from "../../shared/index.js";

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

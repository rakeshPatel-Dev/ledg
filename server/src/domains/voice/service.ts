import type {
  VoiceAudioTurnInput,
  VoiceAudioTurnResult,
  VoiceTurnInput,
  VoiceTurnResult,
} from "../../shared/index.js";
import { ServiceUnavailableError } from "../../common/errors/index.js";
import { isGeminiConfigured, parseWithGemini, parseWithGeminiAudio } from "./gemini.js";
import { isBareSlotAnswer, parseWithRules } from "./rules.js";

/**
 * One voice turn: rules handle short answers, Gemini handles natural language.
 * Any Gemini failure falls back to the rule parser, so the feature never dies
 * because of a quota or a malformed completion.
 */
export async function handleVoiceTurn(input: VoiceTurnInput): Promise<VoiceTurnResult> {
  if (isBareSlotAnswer(input.transcript)) {
    return parseWithRules(input);
  }

  if (isGeminiConfigured()) {
    const gemini = await parseWithGemini(input);
    if (gemini) return gemini;
  }

  return parseWithRules(input);
}

/**
 * Audio cannot be parsed by the deterministic rules, so this path has no
 * zero-cost fallback. It is only used when the browser's own recogniser is
 * unavailable, which keeps normal Chrome/Firefox turns on-device.
 */
export async function handleVoiceAudioTurn(
  input: VoiceAudioTurnInput
): Promise<VoiceAudioTurnResult> {
  if (!isGeminiConfigured()) {
    throw new ServiceUnavailableError(
      "Voice recording needs the AI provider. Type the transaction instead."
    );
  }

  const result = await parseWithGeminiAudio(input);
  if (!result) {
    throw new ServiceUnavailableError(
      "I couldn't process that recording. Try again, or type it instead."
    );
  }

  return result;
}

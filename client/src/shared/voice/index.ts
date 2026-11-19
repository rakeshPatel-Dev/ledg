import { z } from "zod";

import { PAYMENT_METHODS, TRANSACTION_TYPES } from "../enums/index.js";

export * from "./categories.js";

/**
 * Shared contract for Ledg AI's voice entry.
 *
 * The client owns the conversation (draft + short history) and posts one turn
 * at a time. The server never stores voice sessions, which keeps the endpoint
 * stateless and safe to run on serverless hosts.
 */

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const isoDaySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const voiceDraftSchema = z.object({
  type: z.enum(TRANSACTION_TYPES).default("expense"),
  amount: z.number().positive().max(10_000_000).nullable().default(null),
  category: z.string().trim().max(100).nullable().default(null),
  note: z.string().trim().max(500).default(""),
  date: isoDaySchema.nullable().default(null),
  paymentMethod: z.enum(PAYMENT_METHODS).nullable().default(null),
  spaceId: objectIdSchema.nullable().default(null),
});

export type VoiceDraft = z.infer<typeof voiceDraftSchema>;

export const VOICE_INTENTS = ["draft", "ask", "confirm", "cancel", "chat"] as const;
export type VoiceIntent = (typeof VOICE_INTENTS)[number];

export const VOICE_MISSING_SLOTS = ["amount", "paymentMethod"] as const;
export type VoiceMissingSlot = (typeof VOICE_MISSING_SLOTS)[number];

export const voiceMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().trim().min(1).max(1000),
});

export type VoiceMessage = z.infer<typeof voiceMessageSchema>;

export const voiceSpaceSchema = z.object({
  id: objectIdSchema,
  name: z.string().trim().min(1).max(100),
});

export type VoiceSpace = z.infer<typeof voiceSpaceSchema>;

export const voiceTurnInputSchema = z.object({
  transcript: z.string().trim().min(1, "Transcript is required").max(1000),
  draft: voiceDraftSchema.nullable().default(null),
  history: z.array(voiceMessageSchema).max(12).default([]),
  spaces: z.array(voiceSpaceSchema).max(50).default([]),
});

export type VoiceTurnInput = z.infer<typeof voiceTurnInputSchema>;

export const voiceTurnResultSchema = z.object({
  reply: z.string().trim().min(1).max(500),
  intent: z.enum(VOICE_INTENTS),
  draft: voiceDraftSchema,
  missing: z.array(z.enum(VOICE_MISSING_SLOTS)).default([]),
  ready: z.boolean(),
  confidence: z.number().min(0).max(1),
  provider: z.enum(["rules", "gemini"]).optional(),
});

export type VoiceTurnResult = z.infer<typeof voiceTurnResultSchema>;

/**
 * Audio fallback for browsers whose Web Speech recogniser cannot reach its
 * speech service (Brave, some Linux builds). The clip is short, mono, and
 * transcoded to WAV in the browser before it is uploaded.
 */
export const VOICE_AUDIO_MIME_TYPES = [
  "audio/wav",
  "audio/mpeg",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
  "audio/flac",
  "audio/aiff",
] as const;

export const voiceAudioTurnInputSchema = z.object({
  audio: z.string().min(1).max(700_000),
  mimeType: z.enum(VOICE_AUDIO_MIME_TYPES),
  draft: voiceDraftSchema.nullable().default(null),
  history: z.array(voiceMessageSchema).max(12).default([]),
  spaces: z.array(voiceSpaceSchema).max(50).default([]),
});

export type VoiceAudioTurnInput = z.infer<typeof voiceAudioTurnInputSchema>;

export const voiceAudioTurnResultSchema = z.object({
  transcript: z.string().trim().max(1000),
  result: voiceTurnResultSchema,
});

export type VoiceAudioTurnResult = z.infer<typeof voiceAudioTurnResultSchema>;

export const VOICE_EXAMPLES = [
  "Samosa for 50 cash",
  "Spent 1,200 on groceries yesterday",
  "Salary 50,000 received today",
  "Pathao 180",
  "Paid 2,500 for rent by bank",
] as const;

export function missingVoiceSlots(draft: VoiceDraft): VoiceMissingSlot[] {
  const missing: VoiceMissingSlot[] = [];
  if (draft.amount == null) missing.push("amount");
  if (draft.paymentMethod == null) missing.push("paymentMethod");
  return missing;
}

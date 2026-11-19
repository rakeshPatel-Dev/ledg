import { z } from "zod";

import {
  missingVoiceSlots,
  voiceDraftSchema,
  type VoiceAudioTurnInput,
  type VoiceAudioTurnResult,
  type VoiceDraft,
  type VoiceIntent,
  type VoiceTurnInput,
  type VoiceTurnResult,
} from "../../shared/index.js";
import { logger } from "../../config/logger.js";
import { buildVoiceAudioPrompt, buildVoicePrompt } from "./prompt.js";
import { detectTypeCue, isBareAffirmative, normalizeDraft, todayKey } from "./rules.js";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 12_000;
const AUDIO_TIMEOUT_MS = 20_000;

const modelTurnSchema = z.object({
  reply: z.string().trim().min(1).max(500),
  intent: z.enum(["draft", "ask", "confirm", "cancel", "chat"]),
  draft: voiceDraftSchema,
  confidence: z.number().min(0).max(1).default(0.8),
  /** Only present for audio turns: the model transcribes before parsing. */
  transcript: z.string().trim().max(1000).optional(),
});

type ModelTurn = z.infer<typeof modelTurnSchema>;

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

function emptyDraft(today: string): VoiceDraft {
  return {
    type: "expense",
    amount: null,
    category: null,
    note: "",
    date: today,
    paymentMethod: null,
    spaceId: null,
  };
}

const geminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({
            parts: z.array(z.object({ text: z.string().optional() })).optional(),
          })
          .optional(),
      })
    )
    .optional(),
});

function configuredModel(): string {
  const raw = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  // Keep the path segment safe even if someone misconfigures the env var.
  return /^[a-zA-Z0-9._-]+$/.test(raw) ? raw : DEFAULT_MODEL;
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

/**
 * Field-wise merge so a model that omits a slot cannot erase what the user
 * already told us on a previous turn. Explicit non-empty values win.
 */
function mergeModelDraft(
  previous: VoiceDraft | null,
  model: VoiceDraft,
  transcript: string
): VoiceDraft {
  const base: VoiceDraft =
    previous ??
    ({
      type: "expense",
      amount: null,
      category: null,
      note: "",
      date: null,
      paymentMethod: null,
      spaceId: null,
    } satisfies VoiceDraft);

  const typeCue = detectTypeCue(transcript);
  const type = typeCue ?? previous?.type ?? model.type;

  return {
    type,
    amount: model.amount ?? base.amount,
    category: model.category ?? base.category,
    note: model.note.trim() || base.note,
    date: model.date ?? base.date,
    paymentMethod: model.paymentMethod ?? base.paymentMethod,
    spaceId: model.spaceId ?? base.spaceId,
  };
}

function sameDraft(a: VoiceDraft, b: VoiceDraft): boolean {
  return (
    a.type === b.type &&
    a.amount === b.amount &&
    a.category === b.category &&
    a.note === b.note &&
    a.date === b.date &&
    a.paymentMethod === b.paymentMethod &&
    a.spaceId === b.spaceId
  );
}

/**
 * Sends one generateContent request and validates the JSON envelope. Returns
 * null on any failure so callers can fall back instead of throwing.
 */
async function requestTurn(
  parts: GeminiPart[],
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<ModelTurn | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const url = `${GEMINI_ENDPOINT}/${configuredModel()}:generateContent`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.15,
          maxOutputTokens: 700,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    logger.warn({ error }, "Voice: Gemini request failed");
    return null;
  }

  if (!response.ok) {
    logger.warn({ status: response.status }, "Voice: Gemini returned a non-OK status");
    return null;
  }

  const payload = geminiResponseSchema.safeParse(await response.json().catch(() => null));
  if (!payload.success) return null;

  const text =
    payload.data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("") ?? "";

  if (!text.trim()) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(stripCodeFences(text));
  } catch {
    logger.warn("Voice: Gemini returned invalid JSON");
    return null;
  }

  const parsed = modelTurnSchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn({ issues: parsed.error.issues }, "Voice: Gemini JSON failed validation");
    return null;
  }

  return parsed.data;
}

/**
 * Turns the model's proposal into the server-owned result. The model never gets
 * to control readiness, confirmations, or which reply is spoken.
 */
function finalizeTurn(
  model: ModelTurn,
  input: VoiceTurnInput,
  transcript: string
): VoiceTurnResult {
  const today = todayKey();
  let intent: VoiceIntent = model.intent;
  let reply = model.reply;

  // Small talk must not touch the draft. The model is told to use "chat" for
  // greetings and meta questions, but never trust its draft on that path.
  if (intent === "chat") {
    const draft = input.draft ?? emptyDraft(today);
    const missing = missingVoiceSlots(draft);
    return {
      reply,
      intent,
      draft,
      missing,
      ready: missing.length === 0,
      confidence: model.confidence,
      provider: "gemini",
    };
  }

  const merged = mergeModelDraft(input.draft, model.draft, transcript);
  const draft = normalizeDraft(merged, input.spaces, today);
  const missing = missingVoiceSlots(draft);
  const ready = missing.length === 0;

  const previousMissing = input.draft ? missingVoiceSlots(input.draft) : null;
  const previousReady = previousMissing != null && previousMissing.length === 0;

  // A pure agreement belongs to the rules, not the model's imagination. This
  // keeps "of course" from becoming an Education category change while still
  // letting "yes, make it 60" through as a correction.
  if (previousReady && input.draft && isBareAffirmative(transcript)) {
    return {
      reply: "Adding it now.",
      intent: "confirm",
      draft: input.draft,
      missing: [],
      ready: true,
      confidence: 0.99,
      provider: "gemini",
    };
  }

  if (isBareAffirmative(transcript)) {
    if (!input.draft) {
      const draft = emptyDraft(today);
      const missing = missingVoiceSlots(draft);
      return {
        reply: "There's nothing to add yet. Tell me what you spent.",
        intent: "chat",
        draft,
        missing,
        ready: false,
        confidence: 0.99,
        provider: "gemini",
      };
    }

    const missing = previousMissing ?? missingVoiceSlots(input.draft);
    return {
      reply: missing.includes("amount")
        ? "How much was it?"
        : "Was that cash, card, or wallet?",
      intent: "ask",
      draft: input.draft,
      missing,
      ready: false,
      confidence: 0.99,
      provider: "gemini",
    };
  }

  // Never confirm a draft that was incomplete, or one the model silently
  // changed while claiming the user agreed. Corrections get another turn.
  if (intent === "confirm") {
    if (!previousReady || !input.draft || !sameDraft(draft, input.draft)) {
      intent = ready ? "draft" : "ask";
    }
  }

  if (intent !== "cancel" && intent !== "confirm") {
    intent = ready ? "draft" : "ask";
    if (!ready) {
      if (missing.includes("amount")) {
        reply =
          draft.note && draft.note.length <= 40
            ? `How much for the ${draft.note}?`
            : "How much was it?";
      } else {
        reply = "Was that cash, card, or wallet?";
      }
    }
  }

  if (intent === "cancel") reply = "Okay, cancelled.";
  if (intent === "confirm") reply = "Adding it now.";

  return {
    reply,
    intent,
    draft,
    missing,
    ready,
    confidence: model.confidence,
    provider: "gemini",
  };
}

/**
 * Calls Gemini for a typed turn, or null on any failure. Failure is always
 * recoverable: the caller falls back to the deterministic parser.
 */
export async function parseWithGemini(
  input: VoiceTurnInput
): Promise<VoiceTurnResult | null> {
  const today = todayKey();
  const model = await requestTurn([{ text: buildVoicePrompt(input, today) }]);
  if (!model) return null;

  return finalizeTurn(model, input, input.transcript);
}

/**
 * One request transcribes the clip and parses the turn. Splitting transcription
 * and parsing into two calls would double the free-tier request count for no
 * accuracy gain, so the prompt asks for both in the same JSON object.
 */
export async function parseWithGeminiAudio(
  input: VoiceAudioTurnInput
): Promise<VoiceAudioTurnResult | null> {
  const today = todayKey();
  const turnInput: VoiceTurnInput = {
    transcript: "",
    draft: input.draft,
    history: input.history,
    spaces: input.spaces,
  };

  const model = await requestTurn(
    [
      { text: buildVoiceAudioPrompt(turnInput, today) },
      { inlineData: { mimeType: input.mimeType, data: input.audio } },
    ],
    AUDIO_TIMEOUT_MS
  );

  if (!model) return null;

  const transcript = model.transcript?.trim() ?? "";

  // The clip passed the client's silence check but the model still heard
  // nothing usable. Treat it like small talk so the draft is untouched and the
  // user can simply tap the mic again.
  if (!transcript) {
    const draft = input.draft ?? emptyDraft(today);
    const missing = missingVoiceSlots(draft);
    return {
      transcript: "",
      result: {
        reply: "I didn't catch that. Tap the mic and try again.",
        intent: "chat",
        draft,
        missing,
        ready: missing.length === 0,
        confidence: 0,
        provider: "gemini",
      },
    };
  }

  return {
    transcript,
    result: finalizeTurn(model, turnInput, transcript),
  };
}

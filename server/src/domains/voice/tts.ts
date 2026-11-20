import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

import { logger } from "../../config/logger.js";

/**
 * Free neural text-to-speech through Microsoft Edge's Read Aloud service.
 *
 * Chosen over Gemini TTS because Gemini's free tier allows only 10 clips per
 * day, which one conversation can exhaust. Edge needs no API key and returns
 * a natural female voice in ~300-600ms once the WebSocket is connected.
 *
 * The service is unofficial, so every failure returns null: the browser keeps
 * `speechSynthesis` as its fallback, and the module can be swapped for another
 * provider without touching the client.
 */

const DEFAULT_VOICE = "en-IN-NeerjaNeural";
const OUTPUT = OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3;
const MIME_TYPE = "audio/mpeg";
const CONNECTION_TIMEOUT_MS = 10_000;
const SYNTHESIS_TIMEOUT_MS = 20_000;
const MAX_TEXT_LENGTH = 320;
const MAX_CACHE_ENTRIES = 120;
const MAX_CACHE_BYTES = 16 * 1024 * 1024;
// A slightly calmer pace suits short assistant prompts. Edge accepts a
// relative percentage; keep it subtle so the voice still sounds natural.
const SPEECH_RATE = "-2%";

// Fixed lines the rule parser and save flow speak without any user-specific
// content. Warming them at startup makes the common path a cache hit.
const PREWARM_TEXTS = [
  "Adding it now.",
  "Added.",
  "How much was it?",
  "Was that cash, card, or wallet?",
  "There's nothing to add yet. Tell me what you spent.",
  "Okay, cancelled.",
  "I didn't catch that. Tap the mic and try again.",
];

interface CachedClip {
  audio: Buffer;
  mimeType: string;
}

export interface SpeechClip extends CachedClip {
  cached: boolean;
}

const cache = new Map<string, CachedClip>();
let cacheBytes = 0;
let prewarmStarted = false;
let enginePromise: Promise<MsEdgeTTS> | null = null;
let engineVoice: string | null = null;

function configuredVoice(): string {
  const raw = process.env.VOICE_TTS_VOICE?.trim() || DEFAULT_VOICE;
  // Voice names are simple identifiers; reject anything that could break the
  // SSML or the service URL.
  return /^[a-zA-Z0-9-]+$/.test(raw) ? raw : DEFAULT_VOICE;
}

export function isSpeechConfigured(): boolean {
  return process.env.VOICE_TTS !== "off";
}

/** Collapses whitespace so "Saved." and "Saved. " share one cache entry. */
export function normalizeSpeechText(text: string): string {
  const withoutControlCharacters = Array.from(text)
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 0x20 || code === 0x09 || code === 0x0a || code === 0x0d;
    })
    .join("");

  return withoutControlCharacters.replace(/\s+/g, " ").trim();
}

export function isValidSpeechText(text: string): boolean {
  const normalized = normalizeSpeechText(text);
  return normalized.length > 0 && normalized.length <= MAX_TEXT_LENGTH;
}

/** The library injects text into SSML, so user/model text must be escaped. */
export function escapeSsml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function resetEngine(engine?: MsEdgeTTS | null): void {
  if (engine) {
    try {
      engine.close();
    } catch {
      // Already closed.
    }
  }
  enginePromise = null;
  engineVoice = null;
}

async function getEngine(): Promise<MsEdgeTTS> {
  const voice = configuredVoice();
  if (enginePromise && engineVoice === voice) return enginePromise;

  if (enginePromise) {
    const previous = await enginePromise.catch(() => null);
    resetEngine(previous);
  }

  engineVoice = voice;
  const engine = new MsEdgeTTS({
    connectionTimeoutMs: CONNECTION_TIMEOUT_MS,
    synthesisTimeoutMs: SYNTHESIS_TIMEOUT_MS,
  });

  enginePromise = engine
    .setMetadata(voice, OUTPUT)
    .then(() => engine)
    .catch((error) => {
      resetEngine(engine);
      throw error;
    });

  return enginePromise;
}

function collectAudio(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    stream.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("close", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

async function requestSpeech(text: string): Promise<CachedClip | null> {
  let engine: MsEdgeTTS | null = null;

  try {
    engine = await getEngine();
    const { audioStream } = await engine.toStream(escapeSsml(text), {
      rate: SPEECH_RATE,
    });
    const audio = await collectAudio(audioStream);

    if (audio.length === 0) {
      throw new Error("Speech service returned empty audio");
    }

    return { audio, mimeType: MIME_TYPE };
  } catch (error) {
    logger.warn(
      { error, voice: configuredVoice() },
      "Neural speech failed; using device speech"
    );
    // Drop the connection so the next request starts a fresh handshake.
    resetEngine(engine);
    return null;
  }
}

function remember(key: string, clip: CachedClip): void {
  const existing = cache.get(key);
  if (existing) {
    cacheBytes -= existing.audio.length;
    cache.delete(key);
  }

  cache.set(key, clip);
  cacheBytes += clip.audio.length;

  while (cache.size > MAX_CACHE_ENTRIES || cacheBytes > MAX_CACHE_BYTES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey == null) break;
    const oldest = cache.get(oldestKey);
    cache.delete(oldestKey);
    if (oldest) cacheBytes -= oldest.audio.length;
  }
}

/**
 * Returns a playable clip for `text`, or null when synthesis is unavailable.
 * Callers must validate the text first; this also guards direct calls.
 */
export async function getSpeechClip(text: string): Promise<SpeechClip | null> {
  const normalized = normalizeSpeechText(text);
  if (!isValidSpeechText(normalized) || !isSpeechConfigured()) return null;

  const key = `${configuredVoice()}|${SPEECH_RATE}|${normalized}`;
  const hit = cache.get(key);
  if (hit) {
    // Refresh insertion order so the LRU keeps frequently spoken lines.
    cache.delete(key);
    cache.set(key, hit);
    return { ...hit, cached: true };
  }

  const clip = await requestSpeech(normalized);
  if (!clip) return null;

  remember(key, clip);
  return { ...clip, cached: false };
}

/**
 * Fire-and-forget warm-up of the fixed prompt lines. Skipped on serverless
 * hosts, where the instance may be gone before the calls finish.
 */
export function prewarmSpeech(): void {
  if (prewarmStarted || process.env.VERCEL || !isSpeechConfigured()) return;
  if (process.env.VOICE_TTS_PREWARM === "false") return;
  prewarmStarted = true;

  void (async () => {
    let warmed = 0;
    for (const text of PREWARM_TEXTS) {
      const clip = await getSpeechClip(text);
      if (!clip) break; // service unavailable: stop hammering it
      warmed += 1;
    }
    if (warmed > 0) {
      logger.info({ clips: warmed }, "Voice prompt cache warmed");
    }
  })().catch((error) => {
    logger.warn({ error }, "Voice prompt cache warm-up failed");
  });
}

/** Test hook: resets cache and connection state between cases. */
export function resetSpeechCacheForTests(): void {
  cache.clear();
  cacheBytes = 0;
  prewarmStarted = true;
  resetEngine();
}

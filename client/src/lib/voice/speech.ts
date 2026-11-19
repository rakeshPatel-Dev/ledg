/**
 * Thin wrappers around the browser Speech APIs.
 *
 * Recognition prefers an installed on-device language pack (Chrome 139+,
 * Firefox 160+) because it works offline and keeps audio on the device. When
 * no local pack is available it falls back to the browser's remote recogniser.
 * Either way the caller must handle `isRecognitionSupported() === false` and
 * runtime failures (the sheet offers typing instead).
 */

interface RecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface RecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: RecognitionAlternative;
}

interface RecognitionResultList {
  length: number;
  [index: number]: RecognitionResult;
}

interface RecognitionEvent extends Event {
  resultIndex: number;
  results: RecognitionResultList;
}

interface RecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

type LocalAvailability = "available" | "downloadable" | "downloading" | "unavailable";

interface RecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  processLocally?: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: ((event: Event) => void) | null;
  onstart: ((event: Event) => void) | null;
}

interface RecognitionConstructor {
  new (): RecognitionInstance;
  /** Chrome 139+ / Firefox 160+. Absent means only remote recognition exists. */
  available?: (options: {
    langs: string[];
    processLocally?: boolean;
  }) => Promise<LocalAvailability>;
}

function getRecognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export function isRecognitionSupported(): boolean {
  return getRecognitionConstructor() != null;
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Number of installed system voices; 0 means speechSynthesis is silent. */
export function getSpeechVoiceCount(): number {
  if (!isSpeechSupported()) return 0;
  return window.speechSynthesis.getVoices().length;
}

export function hasSpeechVoice(): boolean {
  return getSpeechVoiceCount() > 0;
}

export interface RecognitionHandlers {
  /** Full transcript heard so far, including completed and in-progress words. */
  onTranscript?: (text: string, info: { final: boolean }) => void;
  onError?: (code: string) => void;
  /** The recognizer stopped for good. `text` is everything heard this turn. */
  onEnd?: (info: { text: string; aborted: boolean }) => void;
}

export interface RecognitionController {
  start: () => void;
  abort: () => void;
}

export interface RecognitionOptions {
  lang?: string;
}

const LOCAL_CHECK_TIMEOUT_MS = 300;
const RESTART_DELAY_MS = 200;
// The session's 20s listening ceiling is the real limit; this only stops a
// browser that ends immediately from spinning forever.
const MAX_RESTARTS = 50;
const localAvailabilityCache = new Map<string, Promise<boolean>>();

/**
 * Resolves whether an on-device language pack is ready for this language. The
 * check is cached: the answer does not change during a session, and the first
 * call must not stall listening if the browser never settles the promise.
 */
function localPackAvailable(
  Constructor: RecognitionConstructor,
  lang: string
): Promise<boolean> {
  if (typeof Constructor.available !== "function") {
    return Promise.resolve(false);
  }

  const cached = localAvailabilityCache.get(lang);
  if (cached) return cached;

  const check = Promise.race([
    Promise.resolve()
      .then(() => Constructor.available!({ langs: [lang], processLocally: true }))
      .catch(() => "unavailable" as LocalAvailability),
    new Promise<LocalAvailability>((resolve) => {
      window.setTimeout(() => resolve("unavailable"), LOCAL_CHECK_TIMEOUT_MS);
    }),
  ])
    .then((status) => status === "available")
    .catch(() => false);

  localAvailabilityCache.set(lang, check);
  return check;
}

export function createRecognizer(
  handlers: RecognitionHandlers,
  options: RecognitionOptions = {}
): RecognitionController | null {
  const Constructor = getRecognitionConstructor();
  if (!Constructor) return null;

  const recognition = new Constructor();
  recognition.lang = options.lang ?? "en-IN";
  // Keep the microphone open across natural pauses. Browsers that ignore this
  // still end the session; the onend handler restarts it while the turn is open.
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let finalSegments: string[] = [];
  let interimText = "";
  let processedFinalIndex = -1;
  let aborted = false;
  let ended = false;
  let mode: "local" | "remote" = "remote";
  let triedLocalToRemote = false;
  let retry: (() => void) | null = null;
  let restartTimer: number | null = null;
  let restarts = 0;

  const fullText = () =>
    `${finalSegments.join(" ")} ${interimText}`.replace(/\s+/g, " ").trim();

  const emitEnd = () => {
    if (ended) return;
    ended = true;
    if (restartTimer != null) {
      window.clearTimeout(restartTimer);
      restartTimer = null;
    }
    handlers.onEnd?.({ text: fullText(), aborted });
  };

  const resetAttempt = () => {
    finalSegments = [];
    interimText = "";
    processedFinalIndex = -1;
  };

  const begin = (next: "local" | "remote") => {
    if (aborted || ended) return;

    mode = next;
    try {
      // Older Chromium ignores unknown properties; assignment is harmless.
      recognition.processLocally = next === "local";
    } catch {
      // Property is read-only in some implementations.
    }

    try {
      recognition.start();
    } catch (error) {
      if (error instanceof DOMException && error.name === "InvalidStateError") {
        // A start is already in flight. Safe to ignore.
        return;
      }
      handlers.onError?.(error instanceof DOMException ? error.name : "unknown");
    }
  };

  const scheduleRestart = () => {
    if (aborted || ended || restartTimer != null) return;

    restartTimer = window.setTimeout(() => {
      restartTimer = null;
      if (aborted || ended) return;
      // Nothing was heard in the previous attempt, so dropping the interim
      // buffer is safe; completed segments are kept across restarts.
      interimText = "";
      processedFinalIndex = -1;
      begin(mode);
    }, RESTART_DELAY_MS);
  };

  recognition.onresult = (event) => {
    let sawFinal = false;
    let nextInterim = "";

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      if (!result) continue;
      const transcript = (result[0]?.transcript ?? "").trim();
      if (!transcript) continue;

      if (result.isFinal) {
        if (index > processedFinalIndex) {
          finalSegments.push(transcript);
          processedFinalIndex = index;
        }
        sawFinal = true;
      } else {
        nextInterim = `${nextInterim} ${transcript}`.trim();
      }
    }

    interimText = nextInterim;
    const text = fullText();
    if (text) {
      restarts = 0;
      handlers.onTranscript?.(text, { final: sawFinal && !interimText });
    }
  };

  recognition.onerror = (event) => {
    if (event.error === "aborted" || aborted) return;

    // A local pack can be listed as available and still fail to start (for
    // example when the download was removed). Retry once with the browser's
    // remote recogniser instead of failing the whole turn.
    if (
      mode === "local" &&
      !triedLocalToRemote &&
      !fullText() &&
      (event.error === "service-not-allowed" ||
        event.error === "language-not-supported" ||
        event.error === "network")
    ) {
      triedLocalToRemote = true;
      retry = () => {
        resetAttempt();
        begin("remote");
      };
      return;
    }

    // Silence is not an error while the user is still thinking. The onend
    // handler restarts the microphone.
    if (event.error === "no-speech") return;

    handlers.onError?.(event.error);
  };

  recognition.onend = () => {
    if (aborted) return;

    const next = retry;
    retry = null;
    if (next) {
      next();
      return;
    }

    if (ended) return;

    // Keep the microphone alive across a pause. The session decides when the
    // turn is finished from its own silence timer, so a browser that closes
    // after one final result does not cut the sentence in half.
    if (restarts < MAX_RESTARTS) {
      restarts += 1;
      scheduleRestart();
      return;
    }

    emitEnd();
  };

  return {
    start: () => {
      if (aborted || ended) return;

      if (typeof Constructor.available !== "function") {
        begin("remote");
        return;
      }

      void localPackAvailable(Constructor, recognition.lang).then((available) => {
        if (aborted || ended) return;
        resetAttempt();
        begin(available ? "local" : "remote");
      });
    },
    abort: () => {
      aborted = true;
      ended = true;
      if (restartTimer != null) {
        window.clearTimeout(restartTimer);
        restartTimer = null;
      }
      try {
        recognition.abort();
      } catch {
        // Already stopped.
      }
    },
  };
}

// ─── Speech synthesis ─────────────────────────────────────────────────────────

let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesBound = false;

function voiceScore(voice: SpeechSynthesisVoice): number {
  const lang = voice.lang.toLowerCase();
  if (lang === "en-in") return 5;
  if (lang === "en-gb") return 4;
  if (lang === "en-us") return 3;
  if (lang.startsWith("en")) return 2;
  return 0;
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  let best: SpeechSynthesisVoice | null = null;
  let bestScore = 0;

  for (const voice of voices) {
    const score = voiceScore(voice);
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }

  return best;
}

function bindVoices(): void {
  if (voicesBound || !isSpeechSupported()) return;
  voicesBound = true;

  const refresh = () => {
    cachedVoice = pickVoice();
  };

  refresh();
  window.speechSynthesis.addEventListener?.("voiceschanged", refresh);
}

export interface SpeakHandlers {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (code: string) => void;
}

export function speak(text: string, handlers: SpeakHandlers = {}): void {
  if (!isSpeechSupported() || !text.trim()) {
    handlers.onEnd?.();
    return;
  }

  bindVoices();

  const synth = window.speechSynthesis;
  // Cancel anything queued so a confirmation always replaces the previous
  // question instead of talking over it.
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = cachedVoice?.lang ?? "en-IN";
  utterance.rate = 1.02;
  utterance.pitch = 1;
  utterance.volume = 1;

  const voice = cachedVoice ?? pickVoice();
  if (voice) utterance.voice = voice;

  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    handlers.onEnd?.();
  };

  utterance.onstart = () => handlers.onStart?.();
  utterance.onend = finish;
  utterance.onerror = (event) => {
    if (event.error === "interrupted" || event.error === "canceled") {
      finish();
      return;
    }
    if (settled) return;
    settled = true;
    handlers.onError?.(event.error);
  };

  // Some browsers leave synthesis paused after a tab switch.
  if (synth.paused) synth.resume();

  try {
    synth.speak(utterance);
  } catch {
    finish();
  }
}

export function cancelSpeech(): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
}

/** Called from a user gesture so mobile browsers warm up the voice list. */
export function primeSpeech(): void {
  bindVoices();
  if (isSpeechSupported()) {
    // Touching getVoices() is enough; actually speaking requires text.
    void window.speechSynthesis.getVoices();
  }
}

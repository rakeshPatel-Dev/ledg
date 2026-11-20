/**
 * Thin wrappers around the browser Speech APIs.
 *
 * Recognition prefers an installed on-device language pack (Chrome 139+,
 * Firefox 160+) because it works offline and keeps audio on the device. When
 * no local pack is available it falls back to the browser's remote recogniser.
 * Either way the caller must handle `isRecognitionSupported() === false` and
 * runtime failures (the sheet offers typing instead).
 */

import { getApi } from "@/lib/api";

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
  /** The browser ended its session and the microphone is about to reopen. */
  onRestart?: () => void;
  /** The microphone is live again after a restart. */
  onStart?: () => void;
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

    // The mic is offline until start() succeeds. Tell the session so its
    // silence countdown does not fire during the handshake and submit only
    // the first word or two.
    handlers.onRestart?.();

    restartTimer = window.setTimeout(() => {
      restartTimer = null;
      if (aborted || ended) return;
      // A browser can end its session before the last words become final.
      // Promote the pending interim text instead of dropping what was just
      // said; only completed phrases survive across the restart otherwise.
      if (interimText) finalSegments.push(interimText);
      interimText = "";
      begin(mode);
    }, RESTART_DELAY_MS);
  };

  recognition.onstart = () => {
    if (aborted || ended) return;
    handlers.onStart?.();
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
        // Append every final result the event reports. Do not gate this on a
        // running result index: some Android builds reset the results array
        // between phrases, and an index guard silently drops the new words.
        finalSegments.push(transcript);
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

// Remote speech is a neural clip served by our own API and cached in memory.
// It sounds better than most installed system voices, but the first uncached
// line can be slow, so after 1.2s the device voice takes over and the clip is
// cached for the next time the same line is spoken. Set VITE_VOICE_TTS=off to
// force device-only speech.
const REMOTE_SPEECH_ENABLED = import.meta.env.VITE_VOICE_TTS !== "off";
const REMOTE_SPEECH_TIMEOUT_MS = 1_200;
const REMOTE_SPEECH_MAX_TEXT = 320;
const MAX_REMOTE_CLIPS = 40;

let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesBound = false;
let activeAudio: HTMLAudioElement | null = null;
let activeAudioUrl: string | null = null;
let activeFetch: AbortController | null = null;
let fallbackTimer: number | null = null;
let speechGeneration = 0;
// Insertion order doubles as LRU order. Object URLs stay alive until evicted
// so a repeat line plays without another request.
const remoteClipUrls = new Map<string, string>();

function voiceScore(voice: SpeechSynthesisVoice): number {
  const lang = voice.lang.toLowerCase();
  const name = voice.name.toLowerCase();

  // Accent fit dominates, then a natural female voice, then quality hints.
  // Word boundaries keep "female" from matching the male-name rule.
  let score = 0;
  if (lang === "en-in") score = 10;
  else if (lang === "en-gb") score = 7;
  else if (lang === "en-us") score = 4;
  else score = 2;

  if (/\b(female|woman)\b/.test(name)) score += 4;
  if (
    /\b(neerja|aria|jenny|sonia|samantha|karen|serena|zira|ava|emma|susan|hazel|salli|joanna|amy|olivia|moira|tessa|fiona)\b/.test(
      name
    )
  ) {
    score += 4;
  }
  if (/\b(male|man)\b/.test(name)) score -= 4;
  if (
    /\b(david|daniel|alex|fred|george|rishi|ravi|mark|james|arthur|oliver|thomas)\b/.test(
      name
    )
  ) {
    score -= 4;
  }
  if (/google|neural|natural|premium|enhanced/.test(name)) score += 2;
  if (/espeak|pico|festival|mbrola|robot|compact/.test(name)) score -= 8;
  // Network voices are usually the higher-quality Google/Microsoft ones.
  if (!voice.localService) score += 1;

  return score;
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  let best: SpeechSynthesisVoice | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const voice of voices) {
    // The app is English-only; a non-English voice would mispronounce every
    // prompt even if it is the only one installed.
    if (!voice.lang.toLowerCase().startsWith("en")) continue;

    const score = voiceScore(voice);
    if (best == null || score > bestScore) {
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

export interface SpeakOptions {
  /** Set false to skip the network and use the device voice only. */
  remote?: boolean;
}

/**
 * True when at least one speech path can produce audio. The system voice may
 * be missing on desktops, but remote TTS still works when the server has a key.
 */
export function isVoiceOutputSupported(): boolean {
  return isRemoteSpeechAvailable() || (isSpeechSupported() && hasSpeechVoice());
}

export function isRemoteSpeechAvailable(text = "x"): boolean {
  return (
    REMOTE_SPEECH_ENABLED &&
    typeof fetch === "function" &&
    typeof Audio !== "undefined" &&
    text.length <= REMOTE_SPEECH_MAX_TEXT
  );
}

function clearPlayback(): void {
  if (fallbackTimer != null) {
    window.clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }

  activeFetch?.abort();
  activeFetch = null;

  if (activeAudio) {
    const audio = activeAudio;
    activeAudio = null;
    activeAudioUrl = null;
    audio.onplaying = null;
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    audio.src = "";
  }
}

function rememberRemoteClip(text: string, url: string): void {
  const existing = remoteClipUrls.get(text);
  if (existing && existing !== url && existing !== activeAudioUrl) {
    URL.revokeObjectURL(existing);
  }

  remoteClipUrls.delete(text);
  remoteClipUrls.set(text, url);

  while (remoteClipUrls.size > MAX_REMOTE_CLIPS) {
    const oldest = remoteClipUrls.keys().next().value;
    if (oldest == null) break;
    const oldUrl = remoteClipUrls.get(oldest);
    remoteClipUrls.delete(oldest);
    if (oldUrl && oldUrl !== activeAudioUrl) URL.revokeObjectURL(oldUrl);
  }
}

function speakLocal(text: string, handlers: SpeakHandlers): void {
  if (!isSpeechSupported()) {
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

function playRemoteClip(url: string, text: string, handlers: SpeakHandlers): void {
  const generation = speechGeneration;
  const audio = new Audio(url);
  activeAudio = audio;
  activeAudioUrl = url;
  audio.preload = "auto";

  let settled = false;

  const finish = () => {
    if (settled) return;
    settled = true;
    if (activeAudio === audio) {
      activeAudio = null;
      activeAudioUrl = null;
    }
    handlers.onEnd?.();
  };

  // Decode failures and autoplay blocks are recoverable: drop to the device
  // voice rather than leaving the conversation silent.
  const fallback = () => {
    if (settled) return;
    settled = true;
    audio.onplaying = null;
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    if (activeAudio === audio) {
      activeAudio = null;
      activeAudioUrl = null;
    }
    if (generation !== speechGeneration) return;
    speakLocal(text, handlers);
  };

  audio.onplaying = () => {
    if (generation === speechGeneration) handlers.onStart?.();
  };
  audio.onended = () => {
    if (generation === speechGeneration) finish();
  };
  audio.onerror = fallback;

  void audio.play().catch(fallback);
}

function speakRemote(text: string, handlers: SpeakHandlers): void {
  const cached = remoteClipUrls.get(text);
  if (cached) {
    remoteClipUrls.delete(text);
    remoteClipUrls.set(text, cached);
    playRemoteClip(cached, text, handlers);
    return;
  }

  const generation = speechGeneration;
  const controller = new AbortController();
  activeFetch = controller;
  let timedOut = false;

  fallbackTimer = window.setTimeout(() => {
    fallbackTimer = null;
    timedOut = true;
    if (generation !== speechGeneration) return;
    speakLocal(text, handlers);
  }, REMOTE_SPEECH_TIMEOUT_MS);

  void getApi()
    .voice.speak(text, controller.signal)
    .then((blob) => {
      if (generation !== speechGeneration) return;
      if (activeFetch === controller) activeFetch = null;

      const url = URL.createObjectURL(blob);
      rememberRemoteClip(text, url);

      // The device voice is already reading this line. The clip is now cached
      // for the next time it comes up.
      if (timedOut) return;

      if (fallbackTimer != null) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      playRemoteClip(url, text, handlers);
    })
    .catch(() => {
      if (generation !== speechGeneration) return;
      if (activeFetch === controller) activeFetch = null;
      if (timedOut) return;

      if (fallbackTimer != null) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      speakLocal(text, handlers);
    });
}

export function speak(
  text: string,
  handlers: SpeakHandlers = {},
  options: SpeakOptions = {}
): void {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    handlers.onEnd?.();
    return;
  }

  // A new line always replaces the previous one, whether it finished or not.
  speechGeneration += 1;
  clearPlayback();

  if (options.remote !== false && isRemoteSpeechAvailable(normalized)) {
    speakRemote(normalized, handlers);
    return;
  }

  speakLocal(normalized, handlers);
}

export function cancelSpeech(): void {
  speechGeneration += 1;
  clearPlayback();
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

/** Called from a user gesture so mobile browsers warm up the voice list. */
export function primeSpeech(): void {
  bindVoices();
  if (isSpeechSupported()) {
    // Touching getVoices() is enough; actually speaking requires text.
    void window.speechSynthesis.getVoices();
  }
}

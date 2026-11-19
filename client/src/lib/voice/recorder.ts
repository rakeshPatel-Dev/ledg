/**
 * Microphone fallback for browsers whose Web Speech recogniser cannot reach a
 * speech service (Brave on Linux is the common case).
 *
 * The clip is recorded locally, trimmed by a tiny energy-based VAD, then
 * downmixed to 16 kHz mono WAV. WAV keeps the upload in a format Gemini accepts
 * everywhere, at ~32 KB per second, which stays well under the API body limit.
 */

export interface RecordedClip {
  blob: Blob;
  mimeType: "audio/wav";
  durationMs: number;
}

export type RecordingOutcome =
  | { status: "ok"; clip: RecordedClip }
  | { status: "silent" }
  | { status: "cancelled" }
  | { status: "error"; code: string };

export interface RecorderController {
  /** Resolves once, with the clip or the reason it was discarded. */
  result: Promise<RecordingOutcome>;
  /** Finish now and keep what was recorded. */
  stop: () => void;
  /** Throw the recording away; used when the sheet closes or a turn changes. */
  cancel: () => void;
}

export interface RecorderOptions {
  maxDurationMs?: number;
  /** How much silence after speech ends the clip. */
  silenceMs?: number;
  /** How long to wait for speech before giving up without an API call. */
  noSpeechMs?: number;
}

const DEFAULT_MAX_DURATION_MS = 10_000;
const DEFAULT_SILENCE_MS = 1_200;
const DEFAULT_NO_SPEECH_MS = 4_500;
const SAMPLE_INTERVAL_MS = 100;
const TARGET_SAMPLE_RATE = 16_000;

type AudioContextConstructor = typeof AudioContext;

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;

  const scope = window as unknown as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };

  return scope.AudioContext ?? scope.webkitAudioContext ?? null;
}

export function isRecordingSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof MediaRecorder === "undefined") return false;
  if (!getAudioContextConstructor()) return false;
  if (typeof navigator === "undefined") return false;
  return typeof navigator.mediaDevices?.getUserMedia === "function";
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder.isTypeSupported !== "function") return undefined;

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function recordingErrorCode(error: unknown): string {
  if (error instanceof DOMException) {
    switch (error.name) {
      case "NotAllowedError":
      case "SecurityError":
        return "not-allowed";
      case "NotFoundError":
      case "NotReadableError":
      case "OverconstrainedError":
        return "audio-capture";
      default:
        break;
    }
  }
  return "recording-failed";
}

// Decoding can happen more than once per session; a shared context avoids
// hitting the browser's per-page AudioContext limit.
let decodeContext: AudioContext | null = null;

function getDecodeContext(): AudioContext | null {
  if (decodeContext) return decodeContext;
  const Constructor = getAudioContextConstructor();
  if (!Constructor) return null;
  decodeContext = new Constructor();
  return decodeContext;
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}

function encodeWav(samples: Int16Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);
  new Int16Array(buffer, 44).set(samples);

  return new Blob([buffer], { type: "audio/wav" });
}

/** Decodes whatever MediaRecorder produced and re-encodes it as 16 kHz WAV. */
async function toWav(blob: Blob): Promise<Blob | null> {
  const context = getDecodeContext();
  if (!context) return null;

  try {
    const encoded = await blob.arrayBuffer();
    const audio = await context.decodeAudioData(encoded);

    const frameCount = Math.max(
      1,
      Math.round((audio.length / audio.sampleRate) * TARGET_SAMPLE_RATE)
    );
    const mono = new Float32Array(audio.length);

    for (let channel = 0; channel < audio.numberOfChannels; channel += 1) {
      const data = audio.getChannelData(channel);
      for (let index = 0; index < data.length; index += 1) {
        mono[index] += data[index] / audio.numberOfChannels;
      }
    }

    const ratio = audio.sampleRate / TARGET_SAMPLE_RATE;
    const samples = new Int16Array(frameCount);

    for (let index = 0; index < frameCount; index += 1) {
      const start = Math.floor(index * ratio);
      const end = Math.min(
        audio.length,
        Math.max(start + 1, Math.floor((index + 1) * ratio))
      );

      let sum = 0;
      for (let source = start; source < end; source += 1) {
        sum += mono[source] ?? 0;
      }

      const sample = Math.max(-1, Math.min(1, sum / (end - start)));
      samples[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    return encodeWav(samples, TARGET_SAMPLE_RATE);
  } catch {
    return null;
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Could not read recording"));
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const comma = result.indexOf(",");
      if (comma === -1) {
        reject(new Error("Could not read recording"));
        return;
      }
      resolve(result.slice(comma + 1));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Starts recording immediately and returns a controller. Returns null when the
 * platform cannot record, so the caller can fall back to typing.
 */
export function startRecording(options: RecorderOptions = {}): RecorderController | null {
  if (!isRecordingSupported()) return null;

  const maxDurationMs = options.maxDurationMs ?? DEFAULT_MAX_DURATION_MS;
  const silenceMs = options.silenceMs ?? DEFAULT_SILENCE_MS;
  const noSpeechMs = options.noSpeechMs ?? DEFAULT_NO_SPEECH_MS;

  let settled = false;
  let cancelled = false;
  let stopRequested = false;
  let finishing = false;
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let context: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let timer: number | null = null;
  let startedAt = performance.now();
  let speechStarted = false;
  let silenceFor = 0;
  const floorSamples: number[] = [];
  const chunks: Blob[] = [];

  let resolveOutcome: (outcome: RecordingOutcome) => void = () => undefined;
  const result = new Promise<RecordingOutcome>((resolve) => {
    resolveOutcome = resolve;
  });

  const clearTimer = () => {
    if (timer != null) {
      window.clearInterval(timer);
      timer = null;
    }
  };

  const releaseCapture = () => {
    clearTimer();
    analyser = null;
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;

    if (context) {
      void context.close().catch(() => undefined);
      context = null;
    }

    if (recorder) {
      if (recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          // Already stopped.
        }
      }
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.onstop = null;
      recorder = null;
    }
  };

  const settle = (outcome: RecordingOutcome) => {
    if (settled) return;
    settled = true;
    releaseCapture();
    resolveOutcome(outcome);
  };

  const finalize = async () => {
    const mimeType = recorder?.mimeType || "audio/webm";
    const blob = new Blob(chunks, { type: mimeType });
    const durationMs = performance.now() - startedAt;

    releaseCapture();

    if (cancelled) {
      settle({ status: "cancelled" });
      return;
    }

    if (blob.size === 0) {
      settle({ status: "error", code: "recording-failed" });
      return;
    }

    const wav = await toWav(blob);
    if (!wav) {
      settle({ status: "error", code: "recording-failed" });
      return;
    }

    settle({
      status: "ok",
      clip: { blob: wav, mimeType: "audio/wav", durationMs },
    });
  };

  const finishRecording = () => {
    if (finishing || settled) return;
    finishing = true;
    clearTimer();

    const active = recorder;
    if (!active || active.state === "inactive") {
      void finalize();
      return;
    }

    // MediaRecorder emits the last chunk on stop; finalize waits for it.
    active.onstop = () => {
      void finalize();
    };
    try {
      active.stop();
    } catch {
      void finalize();
    }
  };

  const tick = () => {
    if (!analyser || settled || cancelled) return;

    const frame = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(frame);

    let sum = 0;
    for (let index = 0; index < frame.length; index += 1) {
      const value = (frame[index] - 128) / 128;
      sum += value * value;
    }
    const rms = Math.sqrt(sum / frame.length);
    const elapsed = performance.now() - startedAt;

    if (elapsed < 350) {
      floorSamples.push(rms);
      return;
    }

    let floor = 0;
    for (const sample of floorSamples) floor += sample;
    floor = floorSamples.length > 0 ? floor / floorSamples.length : 0;

    // Clamp so a user who starts talking immediately cannot raise the floor
    // above a normal speaking level.
    const threshold = Math.min(0.05, Math.max(0.015, floor * 2));

    if (rms >= threshold) {
      speechStarted = true;
      silenceFor = 0;
    } else if (speechStarted) {
      silenceFor += SAMPLE_INTERVAL_MS;
      if (silenceFor >= silenceMs) {
        finishRecording();
        return;
      }
    }

    if (!speechStarted && elapsed >= noSpeechMs) {
      settle({ status: "silent" });
      return;
    }

    if (elapsed >= maxDurationMs) {
      if (speechStarted) finishRecording();
      else settle({ status: "silent" });
    }
  };

  const begin = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        if (
          error instanceof DOMException &&
          (error.name === "OverconstrainedError" || error.name === "TypeError")
        ) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          throw error;
        }
      }

      if (cancelled || settled) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
        settle({ status: "cancelled" });
        return;
      }

      const mimeType = pickMimeType();
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => settle({ status: "error", code: "recording-failed" });

      const Constructor = getAudioContextConstructor();
      if (!Constructor) {
        settle({ status: "error", code: "recording-failed" });
        return;
      }

      context = new Constructor();
      if (context.state === "suspended") {
        await context.resume().catch(() => undefined);
      }

      analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.2;
      context.createMediaStreamSource(stream).connect(analyser);

      recorder.start(250);
      startedAt = performance.now();
      timer = window.setInterval(tick, SAMPLE_INTERVAL_MS);

      if (stopRequested) finishRecording();
    } catch (error) {
      settle({ status: "error", code: recordingErrorCode(error) });
    }
  };

  void begin();

  return {
    result,
    stop: () => {
      if (settled || finishing) return;
      stopRequested = true;
      if (recorder && recorder.state === "recording") finishRecording();
    },
    cancel: () => {
      cancelled = true;
      if (!settled) settle({ status: "cancelled" });
    },
  };
}

import { useCallback, useEffect, useRef, useState } from "react";
import type { Space, TransactionInput, VoiceDraft, VoiceTurnResult } from "@ledg/shared";
import { missingVoiceSlots } from "@ledg/shared";
import { toast } from "sonner";

import { ApiError, getApi } from "@/lib/api";
import { getUserFacingError } from "@/lib/errors";
import { formatCurrency, localDateKey } from "@/lib/format";
import { useCreateTransaction } from "@/lib/queries";
import {
  cancelSpeech,
  createRecognizer,
  hasSpeechVoice,
  isRecognitionSupported,
  isSpeechSupported,
  primeSpeech,
  speak,
  type RecognitionController,
} from "./speech";
import {
  blobToBase64,
  isRecordingSupported,
  startRecording,
  type RecordedClip,
  type RecorderController,
} from "./recorder";

export type VoicePhase =
  "idle" | "listening" | "thinking" | "speaking" | "review" | "saving" | "done" | "error";

/** "off" means typing; a manual mic tap still tries the best voice path. */
export type VoiceListenMode = "speech" | "record" | "off";

export interface VoiceMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

interface UseVoiceSessionOptions {
  open: boolean;
  spaces: Space[];
  /**
   * "speech" uses Web Speech, "record" uploads a short clip for transcription,
   * "off" is typing. A manual tap is allowed to try voice even when "off".
   */
  listenMode?: VoiceListenMode;
  onClose: () => void;
  onEditDraft: (draft: VoiceDraft) => void;
}

const MUTED_KEY = "ledg.voice.muted";

// A remote Web Speech service that is blocked or missing can still be bypassed
// by recording locally and transcribing on the server.
const RECORDABLE_SPEECH_ERRORS = new Set([
  "network",
  "service-not-allowed",
  "language-not-supported",
]);

// A natural pause is part of speaking, not the end of the turn. The recognizer
// keeps running and this timer decides when the thought is complete.
const SILENCE_MS = 1_100;
const MAX_LISTEN_MS = 20_000;
const OPEN_DELAY_MS = 80;

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

function speechErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked or speech recognition is turned off. Allow it in your browser, or type instead.";
    case "audio-capture":
      return "No microphone was found on this device.";
    case "network":
      return "This browser couldn't reach its speech service. Brave often blocks it; try Chrome or Firefox, or type instead.";
    case "language-not-supported":
      return "This browser can't recognise English speech yet. Try Chrome, Edge, or Safari, or type instead.";
    case "no-speech":
      return "I didn't hear anything. Tap the mic and try again.";
    default:
      return "Voice input stopped. Tap the mic to try again, or type instead.";
  }
}

function recordingErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
      return "Microphone access is blocked. Allow it in your browser, or type instead.";
    case "audio-capture":
      return "No microphone was found on this device.";
    case "recording-failed":
      return "I couldn't process that recording. Tap the mic to try again, or type instead.";
    default:
      return "Recording stopped. Tap the mic to try again, or type instead.";
  }
}

function messageId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function pickSpaceId(draftSpaceId: string | null, spaces: Space[]): string | null {
  if (draftSpaceId && spaces.some((space) => space.id === draftSpaceId)) {
    return draftSpaceId;
  }
  return (spaces.find((space) => space.type === "personal") ?? spaces[0])?.id ?? null;
}

/**
 * Owns the voice call loop. The server is stateless; this hook keeps the draft
 * and the recent conversation, and decides when it is safe to create.
 */
export function useVoiceSession({
  open,
  spaces,
  listenMode = "speech",
  onClose,
  onEditDraft,
}: UseVoiceSessionOptions) {
  const [phase, setPhaseState] = useState<VoicePhase>("idle");
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [interim, setInterimState] = useState("");
  const [draft, setDraftState] = useState<VoiceDraft | null>(null);
  const [error, setErrorState] = useState<string | null>(null);
  const [errorCode, setErrorCodeState] = useState<string | null>(null);
  const [muted, setMutedState] = useState<boolean>(readMuted);

  const openRef = useRef(open);
  openRef.current = open;

  const spacesRef = useRef(spaces);
  spacesRef.current = spaces;

  const listenModeRef = useRef(listenMode);
  listenModeRef.current = listenMode;

  // Starts as the requested mode but may downgrade to recording after a
  // recogniser failure. The prop is the user's intent; this ref is reality.
  const activeModeRef = useRef<"speech" | "record">(
    listenMode === "off" ? "speech" : listenMode
  );

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const onEditDraftRef = useRef(onEditDraft);
  onEditDraftRef.current = onEditDraft;

  const phaseRef = useRef<VoicePhase>("idle");
  const messagesRef = useRef<VoiceMessage[]>([]);
  const draftRef = useRef<VoiceDraft | null>(null);
  const interimRef = useRef("");
  const mutedRef = useRef(muted);
  const recognizerRef = useRef<RecognitionController | null>(null);
  const recorderRef = useRef<RecorderController | null>(null);
  const turnRef = useRef(0);
  const speakTokenRef = useRef(0);
  const listenTimerRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const maxListenTimerRef = useRef<number | null>(null);
  const handleUtteranceRef = useRef<(text: string) => void>(() => undefined);
  const handleRecordingRef = useRef<(clip: RecordedClip) => void>(() => undefined);

  const createMutation = useCreateTransaction();
  const createMutationRef = useRef(createMutation);
  createMutationRef.current = createMutation;

  const setPhase = useCallback((next: VoicePhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const setError = useCallback((text: string | null) => {
    setErrorState(text);
  }, []);

  const setInterim = useCallback((text: string) => {
    interimRef.current = text;
    setInterimState(text);
  }, []);

  const pushMessage = useCallback((message: Omit<VoiceMessage, "id">) => {
    const next = [...messagesRef.current, { ...message, id: messageId() }];
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const clearListenTimer = useCallback(() => {
    if (listenTimerRef.current != null) {
      window.clearTimeout(listenTimerRef.current);
      listenTimerRef.current = null;
    }
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current != null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const clearMaxListenTimer = useCallback(() => {
    if (maxListenTimerRef.current != null) {
      window.clearTimeout(maxListenTimerRef.current);
      maxListenTimerRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    clearMaxListenTimer();

    const controller = recognizerRef.current;
    recognizerRef.current = null;
    controller?.abort();

    const recorder = recorderRef.current;
    recorderRef.current = null;
    recorder?.cancel();
  }, [clearMaxListenTimer, clearSilenceTimer]);

  const resetSession = useCallback(() => {
    turnRef.current += 1;
    speakTokenRef.current += 1;
    clearListenTimer();
    stopListening();
    cancelSpeech();
    messagesRef.current = [];
    draftRef.current = null;
    interimRef.current = "";
    setMessages([]);
    setDraftState(null);
    setInterimState("");
    setErrorState(null);
    setErrorCodeState(null);
    setPhase("idle");
  }, [clearListenTimer, setPhase, stopListening]);

  const speakThen = useCallback(
    (text: string, next: () => void) => {
      if (!openRef.current) return;

      if (mutedRef.current || !isSpeechSupported() || !hasSpeechVoice()) {
        next();
        return;
      }

      const token = ++speakTokenRef.current;
      setPhase("speaking");

      let settled = false;
      let started = false;
      let startTimer: number | null = null;
      let endTimer: number | null = null;

      const finish = () => {
        if (settled) return;
        settled = true;
        if (startTimer != null) window.clearTimeout(startTimer);
        if (endTimer != null) window.clearTimeout(endTimer);
        if (token !== speakTokenRef.current) return;
        if (!openRef.current) return;
        next();
      };

      const armEndTimer = () => {
        if (endTimer != null) window.clearTimeout(endTimer);
        endTimer = window.setTimeout(finish, Math.min(15_000, 2_500 + text.length * 90));
      };

      // A browser can accept speak() and never fire onstart when no system
      // voice is installed. Never leave the conversation stuck in "speaking".
      startTimer = window.setTimeout(() => {
        if (!started) finish();
      }, 1_800);

      speak(text, {
        onStart: () => {
          started = true;
          if (startTimer != null) window.clearTimeout(startTimer);
          armEndTimer();
        },
        onEnd: finish,
        onError: finish,
      });
    },
    [setPhase]
  );

  const scheduleListen = useCallback(
    (delay = 180) => {
      if (!openRef.current) return;

      // In text mode the browser's recogniser is known to be broken. Retrying
      // it after every typed turn would fight the user, so stay idle instead.
      if (listenModeRef.current === "off") {
        setPhase("idle");
        return;
      }

      clearListenTimer();
      listenTimerRef.current = window.setTimeout(() => {
        listenTimerRef.current = null;
        if (openRef.current && listenModeRef.current !== "off") {
          beginListeningRef.current();
        }
      }, delay);
    },
    [clearListenTimer, setPhase]
  );

  const createFromDraft = useCallback(
    async (source: VoiceDraft) => {
      const amount = source.amount;
      const spaceId = pickSpaceId(source.spaceId, spacesRef.current);

      if (amount == null || amount <= 0) {
        setError("I still need an amount before I can add this.");
        setErrorCodeState(null);
        setPhase("error");
        return;
      }

      if (!spaceId) {
        setError("Create a space first, then I can add this transaction.");
        setErrorCodeState(null);
        setPhase("error");
        return;
      }

      const category = source.category ?? "Other";
      const date = source.date ?? localDateKey(new Date());
      const payload: TransactionInput = {
        type: source.type,
        category,
        amount,
        note: source.note,
        date: new Date(`${date}T00:00:00`).toISOString(),
        paymentMethod: source.paymentMethod,
        source: "voice",
      };

      setError(null);
      setPhase("saving");
      // A question may still be in flight. Invalidate its callback so it
      // cannot reopen the microphone after the transaction is saved.
      speakTokenRef.current += 1;
      cancelSpeech();

      try {
        await createMutationRef.current.mutateAsync({ spaceId, data: payload });
        setPhase("done");
        pushMessage({
          role: "assistant",
          text: `Added ${formatCurrency(amount)} for ${category}.`,
        });
        toast.success(`Added ${formatCurrency(amount)} for ${category}`);
        // Stay in the done state while the confirmation plays; there is no next
        // action to take, so this must not move the state machine to speaking.
        if (!mutedRef.current && isSpeechSupported()) {
          speak("Added.");
        }
      } catch (caught) {
        const message = getUserFacingError(
          caught,
          "Couldn't save the transaction. Please try again."
        );
        setError(message);
        setErrorCodeState(null);
        setPhase("error");
        toast.error(message);
      }
    },
    [pushMessage, setError, setPhase]
  );

  const applyTurn = useCallback(
    async (result: VoiceTurnResult) => {
      // Chat is not a transaction. Keep whatever draft the user already had so
      // a greeting cannot overwrite the note or trigger a create.
      if (result.intent === "chat") {
        pushMessage({ role: "assistant", text: result.reply });
        speakThen(result.reply, () => scheduleListen(160));
        return;
      }

      if (result.intent === "cancel") {
        pushMessage({ role: "assistant", text: result.reply });
        setPhase("done");
        speakThen(result.reply, () => {
          window.setTimeout(() => {
            if (openRef.current) onCloseRef.current();
          }, 350);
        });
        return;
      }

      draftRef.current = result.draft;
      setDraftState(result.draft);

      if (result.intent === "confirm") {
        await createFromDraft(result.draft);
        return;
      }

      // The common path is one shot: the draft card is the confirmation UI, so
      // there is no spoken recap and no waiting for TTS before the user can save.
      if (result.ready) {
        // Invalidate any pending question callback; the mic must stay closed
        // while the user reviews the card.
        speakTokenRef.current += 1;
        cancelSpeech();
        clearListenTimer();
        setPhase("review");
        return;
      }

      pushMessage({ role: "assistant", text: result.reply });
      setPhase("review");
      speakThen(result.reply, () => {
        if (openRef.current) scheduleListen(220);
      });
    },
    [clearListenTimer, createFromDraft, pushMessage, scheduleListen, setPhase, speakThen]
  );

  const handleRecording = useCallback(
    async (clip: RecordedClip) => {
      if (!openRef.current) return;
      if (phaseRef.current === "thinking" || phaseRef.current === "saving") return;

      stopListening();
      speakTokenRef.current += 1;
      cancelSpeech();
      setInterim("");
      setError(null);
      setErrorCodeState(null);
      setPhase("thinking");

      const history = messagesRef.current.slice(-8);
      const token = ++turnRef.current;

      try {
        const audio = await blobToBase64(clip.blob);
        if (token !== turnRef.current || !openRef.current) return;

        const response = await getApi().voice.audioTurn({
          audio,
          mimeType: clip.mimeType,
          draft: draftRef.current,
          history,
          spaces: spacesRef.current.map(({ id, name }) => ({ id, name })),
        });

        if (token !== turnRef.current || !openRef.current) return;

        // The model could not make out words. Stop the loop instead of
        // recording silence again; the user can tap the mic when ready.
        if (!response.transcript) {
          setError("I didn't catch that. Tap the mic and try again.");
          setErrorCodeState("no-speech");
          setPhase("error");
          return;
        }

        pushMessage({ role: "user", text: response.transcript });
        await applyTurn(response.result);
      } catch (caught) {
        if (token !== turnRef.current) return;
        setError(
          getUserFacingError(
            caught,
            "I couldn't process that recording. Tap the mic and try again."
          )
        );
        // The server has no AI key or the provider failed. Typing still works,
        // so let the sheet offer it instead of looping on a dead mic.
        setErrorCodeState(
          caught instanceof ApiError && caught.status === 503 ? "ai-unavailable" : null
        );
        setPhase("error");
      }
    },
    [applyTurn, pushMessage, setError, setInterim, setPhase, stopListening]
  );

  handleRecordingRef.current = handleRecording;

  const beginRecording = useCallback(() => {
    if (!openRef.current) return;

    clearListenTimer();
    speakTokenRef.current += 1;
    cancelSpeech();
    stopListening();
    primeSpeech();
    setInterim("");
    setError(null);
    setErrorCodeState(null);

    const controller = startRecording();
    if (!controller) {
      setError("This browser can't record audio. Type it instead.");
      setErrorCodeState("recording-unsupported");
      setPhase("error");
      return;
    }

    const attempt = turnRef.current;
    recorderRef.current = controller;
    setPhase("listening");

    void controller.result.then((outcome) => {
      if (recorderRef.current === controller) recorderRef.current = null;
      if (!openRef.current || attempt !== turnRef.current) return;

      if (outcome.status === "cancelled") return;

      if (outcome.status === "silent") {
        setError("I didn't hear anything. Tap the mic and try again.");
        setErrorCodeState("no-speech");
        setPhase("error");
        return;
      }

      if (outcome.status === "error") {
        setError(recordingErrorMessage(outcome.code));
        setErrorCodeState(outcome.code);
        setPhase("error");
        return;
      }

      void handleRecordingRef.current(outcome.clip);
    });
  }, [clearListenTimer, setError, setInterim, setPhase, stopListening]);

  const beginRecordingRef = useRef(beginRecording);
  beginRecordingRef.current = beginRecording;

  const beginListening = useCallback(() => {
    if (!openRef.current) return;

    // A manual tap while typing still tries voice; an automatic turn stays off.
    const mode =
      listenModeRef.current === "off"
        ? isRecognitionSupported()
          ? "speech"
          : "record"
        : activeModeRef.current;

    if (mode === "record" || !isRecognitionSupported()) {
      if (isRecordingSupported()) {
        beginRecordingRef.current();
        return;
      }

      if (!isRecognitionSupported()) {
        setError("Ledg AI can't listen in this browser. Type it instead.");
        setPhase("error");
        return;
      }
    }

    clearListenTimer();
    speakTokenRef.current += 1;
    cancelSpeech();
    stopListening();
    primeSpeech();
    setInterim("");
    setError(null);
    setErrorCodeState(null);
    setPhase("listening");

    const submitAfterPause = (delay: number) => {
      clearSilenceTimer();
      silenceTimerRef.current = window.setTimeout(() => {
        silenceTimerRef.current = null;
        if (!openRef.current || phaseRef.current !== "listening") return;
        const text = interimRef.current.trim();
        if (text) void handleUtteranceRef.current(text);
      }, delay);
    };

    const controller = createRecognizer({
      onTranscript: (text) => {
        setInterim(text);
        // Every new word restarts the end-of-turn window. A short pause or a
        // thinking "um" must not cut the sentence in half.
        submitAfterPause(SILENCE_MS);
      },
      onError: (code) => {
        if (!openRef.current) return;
        if (code === "aborted") return;

        // Keep whatever was heard before the service failed. Switching to a
        // recorded clip here would throw away half a spoken transaction.
        const heard = interimRef.current.trim();
        stopListening();

        if (heard) {
          void handleUtteranceRef.current(heard);
          return;
        }

        // Brave and some Linux builds refuse the remote recogniser. Keep the
        // turn alive by recording locally instead of dropping straight to text.
        if (RECORDABLE_SPEECH_ERRORS.has(code) && isRecordingSupported()) {
          activeModeRef.current = "record";
          setPhase("idle");
          setError(null);
          setErrorCodeState(null);
          clearListenTimer();
          listenTimerRef.current = window.setTimeout(() => {
            listenTimerRef.current = null;
            if (openRef.current) beginRecordingRef.current();
          }, 400);
          return;
        }

        setError(speechErrorMessage(code));
        setErrorCodeState(code);
        setPhase("error");
      },
      onEnd: ({ text }) => {
        if (recognizerRef.current) recognizerRef.current = null;
        if (!openRef.current || phaseRef.current !== "listening") return;

        if (text.trim()) {
          // The browser closed its own session after a result. Give any
          // trailing final event a moment, then submit the full transcript.
          submitAfterPause(180);
          return;
        }

        stopListening();
        setError("I didn't hear anything. Tap the mic and try again.");
        setErrorCodeState("no-speech");
        setPhase("error");
      },
    });

    if (!controller) {
      setError("Ledg AI can't listen in this browser. Type it instead.");
      setPhase("error");
      return;
    }

    recognizerRef.current = controller;
    controller.start();

    // A hard ceiling keeps a hot microphone from staying open forever.
    maxListenTimerRef.current = window.setTimeout(() => {
      maxListenTimerRef.current = null;
      if (!openRef.current || phaseRef.current !== "listening") return;

      const text = interimRef.current.trim();
      if (text) {
        void handleUtteranceRef.current(text);
        return;
      }

      stopListening();
      setError("I didn't hear anything. Tap the mic and try again.");
      setErrorCodeState("no-speech");
      setPhase("error");
    }, MAX_LISTEN_MS);
  }, [
    clearListenTimer,
    clearSilenceTimer,
    setError,
    setInterim,
    setPhase,
    stopListening,
  ]);

  const beginListeningRef = useRef(beginListening);
  beginListeningRef.current = beginListening;

  const handleUtterance = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || !openRef.current) return;
      if (phaseRef.current === "thinking" || phaseRef.current === "saving") return;

      stopListening();
      speakTokenRef.current += 1;
      cancelSpeech();
      setInterim("");

      const history = messagesRef.current.slice(-8);
      pushMessage({ role: "user", text });
      setError(null);
      setErrorCodeState(null);
      setPhase("thinking");

      const token = ++turnRef.current;

      try {
        const result = await getApi().voice.turn({
          transcript: text,
          draft: draftRef.current,
          history,
          spaces: spacesRef.current.map(({ id, name }) => ({ id, name })),
        });

        if (token !== turnRef.current || !openRef.current) return;
        await applyTurn(result);
      } catch (caught) {
        if (token !== turnRef.current) return;
        setError(
          getUserFacingError(
            caught,
            "I couldn't understand that turn. Tap the mic and try again."
          )
        );
        setPhase("error");
      }
    },
    [applyTurn, pushMessage, setError, setInterim, setPhase, stopListening]
  );

  handleUtteranceRef.current = handleUtterance;

  const finishListening = useCallback(() => {
    if (!openRef.current || phaseRef.current !== "listening") return;

    clearSilenceTimer();

    // Give the recogniser a final beat to settle the last word. A tap usually
    // lands while the tail of the sentence is still marked interim.
    const attempt = turnRef.current;
    silenceTimerRef.current = window.setTimeout(() => {
      silenceTimerRef.current = null;
      if (
        !openRef.current ||
        phaseRef.current !== "listening" ||
        attempt !== turnRef.current
      ) {
        return;
      }

      const text = interimRef.current.trim();
      if (!text) {
        stopListening();
        setError("I didn't hear anything. Tap the mic and try again.");
        setErrorCodeState("no-speech");
        setPhase("error");
        return;
      }

      void handleUtteranceRef.current(text);
    }, 160);
  }, [clearSilenceTimer, setError, setPhase, stopListening]);

  const startListening = useCallback(() => {
    if (!openRef.current) return;
    if (phaseRef.current === "thinking" || phaseRef.current === "saving") return;

    if (phaseRef.current === "listening") {
      finishListening();
      return;
    }

    if (phaseRef.current === "speaking") {
      speakTokenRef.current += 1;
      cancelSpeech();
      beginListeningRef.current();
      return;
    }

    if (phaseRef.current === "done") {
      resetSession();
    }

    beginListeningRef.current();
  }, [finishListening, resetSession]);

  const confirm = useCallback(() => {
    if (!openRef.current) return;
    if (phaseRef.current === "saving") return;
    if (!draftRef.current) return;
    if (missingVoiceSlots(draftRef.current).length > 0) return;

    clearListenTimer();
    speakTokenRef.current += 1;
    cancelSpeech();
    stopListening();
    void createFromDraft(draftRef.current);
  }, [clearListenTimer, createFromDraft, stopListening]);

  const retry = useCallback(() => {
    if (phaseRef.current === "error") {
      setError(null);
      setErrorCodeState(null);
      beginListeningRef.current();
    }
  }, [setError]);

  const editDraft = useCallback(() => {
    if (!draftRef.current) return;
    onEditDraftRef.current(draftRef.current);
  }, []);

  const toggleMuted = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMutedState(next);

    try {
      window.localStorage.setItem(MUTED_KEY, next ? "1" : "0");
    } catch {
      // Storage is optional; muting still works for this session.
    }

    if (next) {
      // Stop the current sentence but let the turn loop continue.
      cancelSpeech();
    }
  }, []);

  const sendText = useCallback(
    (text: string) => {
      clearListenTimer();
      speakTokenRef.current += 1;
      cancelSpeech();
      stopListening();
      void handleUtteranceRef.current(text);
    },
    [clearListenTimer, stopListening]
  );

  // Start a fresh one-shot capture whenever the sheet opens. There is no spoken
  // greeting: the microphone must be live before the user starts talking.
  useEffect(() => {
    openRef.current = open;

    if (!open) {
      resetSession();
      clearListenTimer();
      return;
    }

    resetSession();
    activeModeRef.current =
      listenModeRef.current === "off" ? "speech" : listenModeRef.current;

    const timer = window.setTimeout(() => {
      if (!openRef.current) return;
      if (listenModeRef.current === "off") {
        setPhase("idle");
        return;
      }

      primeSpeech();
      beginListeningRef.current();
    }, OPEN_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [open, resetSession, clearListenTimer, setPhase]);

  // Switching back from typing gives the requested mode a fresh chance. The
  // internal record fallback survives because the prop itself has not changed.
  useEffect(() => {
    if (listenMode !== "off") {
      activeModeRef.current = listenMode;
      return;
    }

    clearListenTimer();
    if (phaseRef.current === "listening") {
      stopListening();
      setPhase("idle");
    }
  }, [listenMode, clearListenTimer, setPhase, stopListening]);

  useEffect(() => {
    return () => {
      stopListening();
      cancelSpeech();
    };
  }, [stopListening]);

  const missing = draft ? missingVoiceSlots(draft) : [];
  const ready = draft != null && missing.length === 0;

  return {
    phase,
    messages,
    interim,
    draft,
    missing,
    ready,
    error,
    errorCode,
    muted,
    toggleMuted,
    startListening,
    sendText,
    confirm,
    retry,
    editDraft,
    resetSession,
  };
}

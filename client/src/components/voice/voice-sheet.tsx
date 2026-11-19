import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { Space, VoiceDraft } from "@ledg/shared";
import { PAYMENT_LABELS, VOICE_EXAMPLES, missingVoiceSlots } from "@ledg/shared";
import {
  Check,
  Keyboard,
  Loader2,
  Mic,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { getCategoryMeta } from "@/lib/categories";
import { formatCurrency, localDateKey } from "@/lib/format";
import { useSpaces } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useVoiceSession, type VoiceMessage } from "@/lib/voice/use-voice-session";
import {
  getSpeechVoiceCount,
  isRecognitionSupported,
  isSpeechSupported,
  primeSpeech,
} from "@/lib/voice/speech";
import { isRecordingSupported } from "@/lib/voice/recorder";

import { VoiceOrb } from "./voice-orb";

interface VoiceSheetProps {
  open: boolean;
  onClose: () => void;
  onEditDraft: (draft: VoiceDraft) => void;
}

const TEXT_FALLBACK_ERRORS = new Set([
  "not-allowed",
  "audio-capture",
  "recording-unsupported",
  "ai-unavailable",
]);

const SPEECH_SERVICE_ERRORS = new Set([
  "network",
  "service-not-allowed",
  "language-not-supported",
]);

function draftDateLabel(date: string | null): string {
  if (!date) return "Today";

  const today = localDateKey(new Date());
  if (date === today) return "Today";

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date === localDateKey(yesterday)) return "Yesterday";

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function Chip({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "warning";
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] font-medium",
        tone === "warning"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : "border-border/60 bg-card/70 text-muted-foreground"
      )}
    >
      {children}
    </span>
  );
}

function MessageBubble({ message }: { message: VoiceMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[86%] rounded-3xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-br-lg bg-primary/10 text-foreground"
            : "rounded-bl-lg border border-border/50 bg-card text-card-foreground surface-card"
        )}
      >
        {message.text}
      </div>
    </div>
  );
}

function DraftCard({
  draft,
  spaceName,
  onEdit,
}: {
  draft: VoiceDraft;
  spaceName: string | null;
  onEdit: () => void;
}) {
  const meta = getCategoryMeta(draft.category ?? "Other", draft.type);
  const Icon = meta.icon;
  const missing = missingVoiceSlots(draft);

  return (
    <Card variant="inset" padded={false} className="mt-3 shrink-0 rounded-3xl p-3.5">
      <div className="flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: `color-mix(in oklch, ${meta.color} 14%, transparent)`,
            color: meta.color,
          }}
        >
          <Icon className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {meta.name}
            {draft.note ? ` · ${draft.note}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {draft.type === "income" ? "Income" : "Expense"} · {spaceName ?? "Personal"}
          </p>
        </div>

        <p className="shrink-0 text-base font-bold tabular-nums">
          {draft.amount != null ? formatCurrency(draft.amount) : "—"}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Chip tone={draft.paymentMethod ? "default" : "warning"}>
          {draft.paymentMethod ? PAYMENT_LABELS[draft.paymentMethod] : "Payment needed"}
        </Chip>
        <Chip>{draftDateLabel(draft.date)}</Chip>
        {missing.includes("amount") && <Chip tone="warning">Amount needed</Chip>}
        <button
          type="button"
          onClick={onEdit}
          className="ml-auto inline-flex items-center gap-1 rounded-full px-1.5 py-1 text-xs font-semibold text-primary outline-none transition-colors hover:text-primary/80 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Pencil className="size-3" />
          Edit
        </button>
      </div>
    </Card>
  );
}

export function VoiceSheet({ open, onClose, onEditDraft }: VoiceSheetProps) {
  const { data: spaces } = useSpaces({ enabled: open });
  const [textMode, setTextMode] = useState(false);
  const [textValue, setTextValue] = useState("");
  const [voiceCount, setVoiceCount] = useState(0);
  const [voiceChecked, setVoiceChecked] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const supported = isRecognitionSupported();
  const canRecord = isRecordingSupported();

  const session = useVoiceSession({
    open,
    spaces: spaces ?? [],
    listenMode: textMode ? "off" : supported ? "speech" : canRecord ? "record" : "off",
    onClose,
    onEditDraft,
  });

  useEffect(() => {
    if (!open) {
      setTextMode(false);
      setTextValue("");
      return;
    }
    if (!supported && !canRecord) setTextMode(true);
  }, [open, supported, canRecord]);

  // speechSynthesis can exist while the device has no installed voice, which
  // is why replies silently stay in the chat. Detect that instead of pretending
  // the assistant is speaking.
  useEffect(() => {
    if (!open) {
      setVoiceChecked(false);
      return;
    }

    primeSpeech();
    const update = () => setVoiceCount(getSpeechVoiceCount());
    update();

    const timer = window.setTimeout(() => {
      update();
      setVoiceChecked(true);
    }, 1_200);

    const synth = isSpeechSupported() ? window.speechSynthesis : null;
    synth?.addEventListener?.("voiceschanged", update);

    return () => {
      window.clearTimeout(timer);
      synth?.removeEventListener?.("voiceschanged", update);
    };
  }, [open]);

  // Permission and device errors cannot be fixed by retrying. Speech-service
  // errors are handled inside the session by switching to a recorded clip, so
  // they only force typing when recording is unavailable too.
  useEffect(() => {
    if (!open || !session.errorCode) return;

    if (TEXT_FALLBACK_ERRORS.has(session.errorCode)) {
      setTextMode(true);
      return;
    }

    if (!canRecord && SPEECH_SERVICE_ERRORS.has(session.errorCode)) {
      setTextMode(true);
    }
  }, [open, session.errorCode, canRecord]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [session.messages, session.interim, session.phase, session.error]);

  const submitText = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = textValue.trim();
    if (!value) return;
    setTextValue("");
    session.sendText(value);
  };

  const spaceList: Space[] = spaces ?? [];
  const defaultSpace =
    spaceList.find((space) => space.type === "personal") ?? spaceList[0];
  const draftSpaceName = session.draft?.spaceId
    ? (spaceList.find((space) => space.id === session.draft?.spaceId)?.name ?? null)
    : (defaultSpace?.name ?? null);

  const showAdd =
    session.ready &&
    session.phase !== "done" &&
    session.phase !== "saving" &&
    session.phase !== "thinking";

  const statusText =
    session.phase === "listening"
      ? session.interim
        ? "Hearing you…"
        : "Listening…"
      : session.phase === "thinking"
        ? "Thinking…"
        : session.phase === "speaking"
          ? "Speaking…"
          : session.phase === "saving"
            ? "Adding…"
            : session.phase === "done"
              ? "Added"
              : session.phase === "error"
                ? "Something went wrong"
                : "Tap to talk";

  const subtext =
    session.phase === "error"
      ? (session.error ?? "Tap the orb to try again, or type instead.")
      : session.phase === "listening"
        ? session.ready
          ? "Say yes, or tap Add transaction."
          : "Speak naturally. Tap the orb when you're done."
        : session.phase === "thinking"
          ? "Working out the details."
          : session.phase === "speaking"
            ? "Tap the orb to interrupt."
            : session.phase === "saving"
              ? "Saving to your space."
              : session.phase === "done"
                ? "It's in your activity."
                : "Try: samosa for 50 cash";

  const footer = showAdd ? (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button variant="outline" size="lg" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button size="lg" className="flex-[1.4]" onClick={session.confirm}>
          <Check className="mr-2 size-4" />
          Add transaction
        </Button>
      </div>
      <p className="text-center text-[11px] text-muted-foreground">
        Confirm to create it. Nothing is saved until you do.
      </p>
    </div>
  ) : session.phase === "saving" ? (
    <Button size="lg" className="w-full" disabled>
      <Loader2 className="mr-2 size-4 animate-spin" />
      Adding…
    </Button>
  ) : session.phase === "done" ? (
    <div className="flex gap-2">
      <Button variant="outline" size="lg" className="flex-1" onClick={onClose}>
        Close
      </Button>
      <Button size="lg" className="flex-1" onClick={session.startListening}>
        <Plus className="mr-2 size-4" />
        Add another
      </Button>
    </div>
  ) : (
    <div className="flex flex-col gap-2">
      {textMode ? (
        <div className="flex flex-col gap-2">
          <form onSubmit={submitText} className="flex items-center gap-2">
            <Input
              autoFocus
              value={textValue}
              onChange={(event) => setTextValue(event.target.value)}
              placeholder="e.g. samosa for 50 cash"
              aria-label="Type a transaction"
            />
            <Button type="submit" size="icon-lg" aria-label="Send transaction text">
              <Send className="size-4" />
            </Button>
          </form>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {supported || canRecord ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTextMode(false);
                    session.startListening();
                  }}
                >
                  <Mic className="mr-1.5 size-4" />
                  Try voice
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                onClick={session.toggleMuted}
                aria-label={session.muted ? "Unmute assistant" : "Mute assistant"}
              >
                {session.muted ? <VolumeX /> : <Volume2 />}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close Ledg AI"
            >
              <X />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={session.toggleMuted}
            aria-label={session.muted ? "Unmute assistant" : "Mute assistant"}
          >
            {session.muted ? <VolumeX /> : <Volume2 />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTextMode(true)}>
            <Keyboard className="mr-1.5 size-4" />
            Type instead
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close Ledg AI"
          >
            <X />
          </Button>
        </div>
      )}
      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        Speech is handled by your browser or recorded as a short clip. Clips go to our AI
        provider for transcription; Ledg never stores audio.
      </p>
    </div>
  );

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Ledg AI"
      description="Voice entry. Say what you spent, and I'll do the bookkeeping."
      className="h-[88dvh]"
      scrollClassName="flex min-h-0 flex-col overflow-hidden"
      footer={footer}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {!supported && !canRecord && (
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
            This browser can't listen to speech. Type your transaction below and Ledg AI
            will take it from there.
          </div>
        )}

        {voiceChecked && isSpeechSupported() && voiceCount === 0 && (
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
            This device has no system voice, so replies appear here as text. Install a
            voice in your device settings to hear Ledg AI.
          </div>
        )}

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
          aria-live="polite"
        >
          {session.messages.length === 0 && !session.interim ? (
            <div className="rounded-3xl border border-dashed border-border/70 bg-muted/25 p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Sparkles className="size-3.5" />
                Try telling Ledg AI
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {VOICE_EXAMPLES.slice(0, 3).map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => session.sendText(example)}
                    className="rounded-2xl border border-border/50 bg-card/80 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-card focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    “{example}”
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {session.messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {session.interim ? (
                <div className="flex justify-end">
                  <div className="max-w-[86%] rounded-3xl rounded-br-lg border border-dashed border-primary/35 bg-primary/5 px-4 py-2.5 text-sm italic leading-relaxed text-muted-foreground">
                    {session.interim}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-2 pt-1">
          <VoiceOrb phase={session.phase} onTap={session.startListening} />
          <div className="text-center" role="status" aria-live="polite">
            <p className="text-sm font-semibold">{statusText}</p>
            <p className="mx-auto mt-1 max-w-[19rem] text-xs leading-relaxed text-muted-foreground">
              {subtext}
            </p>
          </div>
        </div>

        {session.phase === "error" && (
          <div className="flex shrink-0 items-center justify-between gap-2 rounded-2xl border border-destructive/25 bg-destructive/8 px-3.5 py-2.5">
            <p className="min-w-0 flex-1 text-xs leading-relaxed text-destructive">
              {session.error}
            </p>
            <Button variant="soft" size="xs" onClick={session.retry}>
              Try again
            </Button>
          </div>
        )}

        {session.draft ? (
          <DraftCard
            draft={session.draft}
            spaceName={draftSpaceName}
            onEdit={session.editDraft}
          />
        ) : null}
      </div>
    </Sheet>
  );
}

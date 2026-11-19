import { motion } from "framer-motion";
import { AudioLines, Check, Loader2, Mic, RotateCcw, Volume2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { VoicePhase } from "@/lib/voice/use-voice-session";

interface VoiceOrbProps {
  phase: VoicePhase;
  onTap: () => void;
  compact?: boolean;
}

const LABELS: Record<VoicePhase, string> = {
  idle: "Start listening",
  listening: "Finish listening",
  thinking: "Thinking",
  speaking: "Speaking. Tap to interrupt.",
  review: "Say a correction",
  saving: "Saving the transaction",
  done: "Add another transaction",
  error: "Try listening again",
};

export function VoiceOrb({ phase, onTap, compact = false }: VoiceOrbProps) {
  const listening = phase === "listening";
  const speaking = phase === "speaking";
  const busy = phase === "thinking" || phase === "saving";
  const iconClass = compact ? "size-6" : "size-9";

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center",
        compact ? "size-28" : "size-44"
      )}
    >
      {listening && (
        <>
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              className={cn(
                "pointer-events-none absolute rounded-full border border-primary/35 bg-primary/5",
                compact ? "size-20" : "size-28"
              )}
              initial={{ scale: 0.9, opacity: 0.45 }}
              animate={{ scale: 2.05, opacity: 0 }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "easeOut",
                delay: index * 0.75,
              }}
            />
          ))}
        </>
      )}

      {speaking && (
        <motion.span
          className={cn(
            "pointer-events-none absolute rounded-full bg-primary/10",
            compact ? "size-24" : "size-32"
          )}
          animate={{ scale: [1, 1.18, 1], opacity: [0.55, 0.2, 0.55] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <motion.button
        type="button"
        onClick={onTap}
        disabled={busy}
        whileTap={{ scale: 0.94 }}
        aria-label={LABELS[phase]}
        className={cn(
          "relative z-10 flex items-center justify-center rounded-full border text-primary-foreground outline-none transition-shadow",
          compact ? "size-20" : "size-28",
          "border-[color-mix(in_oklch,var(--primary),black_14%)] bg-[linear-gradient(180deg,var(--primary-top),var(--primary))] shadow-elev-primary",
          "focus-visible:ring-3 focus-visible:ring-ring/50",
          phase === "error" &&
            "border-destructive/40 bg-[linear-gradient(180deg,color-mix(in_oklch,var(--destructive),white_12%),var(--destructive))] shadow-[0_10px_28px_-10px_color-mix(in_oklch,var(--destructive)_45%,transparent)]",
          phase === "done" && "opacity-95",
          busy && "opacity-90"
        )}
      >
        {busy ? (
          <Loader2 className={cn(iconClass, "animate-spin")} />
        ) : phase === "speaking" ? (
          <Volume2 className={iconClass} />
        ) : phase === "done" ? (
          <Check className={iconClass} />
        ) : phase === "error" ? (
          <RotateCcw className={iconClass} />
        ) : listening ? (
          <AudioLines className={iconClass} />
        ) : (
          <Mic className={iconClass} />
        )}
      </motion.button>
    </div>
  );
}

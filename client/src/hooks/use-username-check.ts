import { useState, useEffect, useRef } from "react";
import { getApi } from "@/lib/api";
import { USERNAME_REGEX, RESERVED_USERNAMES } from "@ledg/shared";

export type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

interface Options {
  /** Current username to skip check when value unchanged (e.g. already the user's own handle). */
  currentUsername?: string | null;
  /** Debounce delay in ms. Default: 350. */
  delay?: number;
}

interface UsernameCheckResult {
  status: UsernameStatus;
  reason: string;
  /** Call with the raw input value on every keystroke. */
  check: (value: string) => void;
  /** Reset back to idle. */
  reset: () => void;
}

/**
 * Lightweight debounced username availability hook.
 *
 * - Does client-side format + reserved validation instantly (no network).
 * - Fires a single `/me/username/check` request only for valid, changed handles.
 * - Cancels in-flight requests on each new keystroke via AbortController.
 */
export function useUsernameCheck(options: Options = {}): UsernameCheckResult {
  const { currentUsername, delay = 350 } = options;

  const [status, setStatus] = useState<UsernameStatus>("idle");
  const [reason, setReason] = useState("");

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const check = (raw: string) => {
    const value = raw.trim().toLowerCase();

    // Clear any pending timer + in-flight request
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();

    // Empty → idle immediately
    if (!value) {
      setStatus("idle");
      setReason("");
      return;
    }

    // Same as current → available immediately (no network needed)
    if (currentUsername && value === currentUsername.toLowerCase()) {
      setStatus("available");
      setReason("");
      return;
    }

    // Format check — instant, zero network
    if (!USERNAME_REGEX.test(value)) {
      setStatus("invalid");
      setReason("3–30 chars: letters, numbers, underscores only");
      return;
    }

    // Reserved check — instant, zero network
    if (RESERVED_USERNAMES.has(value)) {
      setStatus("invalid");
      setReason("Username is reserved");
      return;
    }

    // Debounce the actual network call
    setStatus("checking");
    setReason("");

    timerRef.current = setTimeout(async () => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const result = await getApi().me.checkUsernameAvailable(value, ctrl.signal);
        if (ctrl.signal.aborted) return;

        if (result.available) {
          setStatus("available");
          setReason("");
        } else {
          setStatus("taken");
          setReason(result.reason ?? "Username is already taken");
        }
      } catch (err: unknown) {
        if (ctrl.signal.aborted) return; // intentional cancel
        // Network error — don't block the user, just go idle
        setStatus("idle");
        setReason("");
        void err;
      }
    }, delay);
  };

  const reset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();
    setStatus("idle");
    setReason("");
  };

  return { status, reason, check, reset };
}

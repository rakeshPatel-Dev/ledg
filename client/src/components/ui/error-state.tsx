import { useEffect, useState } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { captureException } from "@/lib/error-tracking";
import { getUserFacingError } from "@/lib/errors";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  /** The query error. Used for the message and for support logging. */
  error?: unknown;
  /** Override the message derived from `error`. */
  description?: string;
  onRetry?: () => void | Promise<unknown>;
  /** Pass the query's `isFetching` so the button reflects a real retry. */
  isRetrying?: boolean;
  retryLabel?: string;
  /** Wrap the state in the standard rounded card. Defaults to true. */
  contained?: boolean;
  className?: string;
}

/**
 * The single failure state used by query-backed screens.
 *
 * It never renders zero or an empty-state message: if a request failed, the
 * user sees that it failed and can retry it.
 */
export function ErrorState({
  title = "Couldn't load this",
  error,
  description,
  onRetry,
  isRetrying,
  retryLabel = "Try again",
  contained = true,
  className,
}: ErrorStateProps) {
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (error) {
      captureException(error, { scope: "query-error" });
    }
  }, [error]);

  const busy = isRetrying ?? retrying;

  const handleRetry = async () => {
    if (!onRetry || busy) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  const content = (
    <EmptyState
      tone="destructive"
      icon={<AlertTriangle className="size-7" />}
      title={title}
      description={description ?? getUserFacingError(error)}
      action={
        onRetry ? (
          <Button
            variant="outline"
            onClick={handleRetry}
            disabled={busy}
            className="rounded-full"
          >
            <RotateCw className={cn("size-4", busy && "animate-spin")} />
            {busy ? "Trying again…" : retryLabel}
          </Button>
        ) : undefined
      }
      className={className}
    />
  );

  if (!contained) return content;

  return <Card className="rounded-4xl border border-border/60 p-2">{content}</Card>;
}

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Phone,
  Trash2,
  Undo2,
} from "lucide-react";
import type { Debt, DebtSettlement } from "@ledg/shared";
import { PAYMENT_LABELS } from "@ledg/shared";

import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDeleteDue, useDue, useUndoSettlement } from "@/lib/queries";
import { formatCurrency, formatDate, formatRelativeCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DueDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dueId: string | null;
  onOpenSettle: (due: Debt) => void;
}

export function DueDetailSheet({
  open,
  onOpenChange,
  dueId,
  onOpenSettle,
}: DueDetailSheetProps) {
  const { data: due, isLoading } = useDue(dueId || "");
  const undoMutation = useUndoSettlement();
  const deleteMutation = useDeleteDue();
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!dueId) return null;

  const isLent = due?.direction === "lent";
  const remaining = due ? Math.max(0, due.principal - (due.settledAmount ?? 0)) : 0;
  const progressPercent =
    due && due.principal > 0
      ? Math.min(100, Math.round(((due.settledAmount ?? 0) / due.principal) * 100))
      : 0;

  const isOverdue =
    due &&
    due.status !== "settled" &&
    due.dueDate &&
    new Date(due.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);

  const daysOverdue = isOverdue
    ? Math.round(
        (new Date().setHours(0, 0, 0, 0) -
          new Date(due.dueDate!).setHours(0, 0, 0, 0)) /
          86_400_000
      )
    : 0;

  const isSettled = due?.status === "settled";

  const handleUndo = async (settlement: DebtSettlement) => {
    if (!due) return;
    toast(`Undo ${formatCurrency(settlement.amount)} settlement?`, {
      description: `From ${formatDate(settlement.date)}`,
      action: {
        label: "Undo",
        onClick: async () => {
          try {
            setUndoingId(settlement.id);
            await undoMutation.mutateAsync({ id: due.id, settlementId: settlement.id });
            toast.success("Settlement undone");
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to undo";
            toast.error(msg);
          } finally {
            setUndoingId(null);
          }
        },
      },
      cancel: { label: "Cancel", onClick: () => {} },
    });
  };

  const handleDelete = () => {
    if (!due) return;
    toast("Delete this due?", {
      description: "This cannot be undone. The linked transaction will also be removed.",
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            setIsDeleting(true);
            await deleteMutation.mutateAsync(due.id);
            toast.success("Due deleted");
            onOpenChange(false);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to delete";
            toast.error(msg);
          } finally {
            setIsDeleting(false);
          }
        },
      },
      cancel: { label: "Keep", onClick: () => {} },
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {isLoading || !due ? (
        <div className="flex min-h-48 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-7 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading...</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-0">
          {/* ── Hero header ── */}
          <div className={cn(
            "relative -mx-5 -mt-1 mb-5 px-5 pt-4 pb-5",
            isSettled
              ? "bg-muted/40"
              : isLent
                ? "bg-linear-to-br from-emerald-500/10 to-emerald-600/5"
                : "bg-linear-to-br from-amber-500/10 to-amber-600/5"
          )}>
            {/* Top row: avatar + name + status */}
            <div className="flex items-start gap-3 mb-4">
              <div className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-2xl text-white font-black text-base shadow-md",
                isSettled
                  ? "bg-muted text-muted-foreground shadow-none"
                  : isLent
                    ? "bg-linear-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30"
                    : "bg-linear-to-br from-amber-500 to-amber-600 shadow-amber-500/30"
              )}>
                {isSettled ? (
                  <CheckCircle2 className="size-6 text-muted-foreground" />
                ) : isLent ? (
                  <ArrowUpRight className="size-6" />
                ) : (
                  <ArrowDownLeft className="size-6" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-black text-foreground tracking-tight leading-tight">
                    {due.counterparty.name}
                  </h2>
                  <Badge
                    variant={isSettled ? "default" : due.status === "partially_settled" ? "secondary" : "outline"}
                    className={cn(
                      "text-[0.55rem] px-1.5 py-0 h-4 rounded-full uppercase tracking-wider font-bold",
                      isSettled && "bg-emerald-600"
                    )}
                  >
                    {due.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isLent ? "You lent · they owe you" : "You borrowed · you owe them"}
                </p>
              </div>

              {due.counterparty.phone && (
                <a
                  href={`tel:${due.counterparty.phone}`}
                  className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-background/60 text-muted-foreground hover:text-primary border border-border/40 transition-all"
                  aria-label="Call contact"
                >
                  <Phone className="size-4" />
                </a>
              )}
            </div>

            {/* Big remaining amount */}
            <div className="mb-4">
              <p className={cn(
                "text-3xl font-black tabular-nums tracking-tight leading-none",
                isSettled ? "text-muted-foreground" : isLent ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
              )}>
                {isSettled ? "Settled" : formatCurrency(remaining)}
              </p>
              {!isSettled && (
                <p className="text-xs text-muted-foreground mt-1">
                  remaining of {formatCurrency(due.principal)} principal
                </p>
              )}
            </div>

            {/* 3-col stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: "Principal", value: formatCurrency(due.principal), color: "text-foreground" },
                {
                  label: "Settled",
                  value: formatCurrency(due.settledAmount ?? 0),
                  color: "text-emerald-600 dark:text-emerald-400",
                },
                { label: "Remaining", value: formatCurrency(remaining), color: isSettled ? "text-muted-foreground" : "text-primary" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl bg-background/50 border border-border/30 p-2.5 text-center">
                  <p className="text-[0.58rem] font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
                  <p className={cn("text-sm font-black tabular-nums", color)}>{value}</p>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[0.62rem] font-semibold text-muted-foreground">
                <span>Repayment progress</span>
                <span className="tabular-nums">{progressPercent}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-background/60">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    isSettled ? "bg-emerald-500" : "bg-primary"
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Date info row */}
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="size-3.5 shrink-0" />
                <span>{formatRelativeCompact(due.date)}</span>
              </div>

              {due.dueDate && (
                <div className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold",
                  isOverdue
                    ? "bg-destructive/15 text-destructive border border-destructive/20"
                    : "bg-background/60 text-muted-foreground border border-border/30"
                )}>
                  {isOverdue ? (
                    <>
                      <AlertTriangle className="size-3" />
                      {daysOverdue}d overdue
                    </>
                  ) : (
                    <>
                      <Clock className="size-3" />
                      Due {formatRelativeCompact(due.dueDate)}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Note */}
            {due.note && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-background/50 border border-border/30 px-3 py-2.5">
                <FileText className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground italic leading-relaxed">
                  {due.note}
                </p>
              </div>
            )}
          </div>

          {/* ── Settlement timeline ── */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Payment History
              </h3>
              <span className="text-[0.6rem] font-semibold text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
                {due.settlements?.length ?? 0} payments
              </span>
            </div>

            {!due.settlements || due.settlements.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 py-8 text-center">
                <p className="text-xs text-muted-foreground">No payments recorded yet</p>
                {!isSettled && (
                  <p className="text-[0.68rem] text-muted-foreground/60 mt-1">
                    Tap "Record Settlement" to start
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {due.settlements.map((settlement, idx) => (
                  <SettlementRow
                    key={settlement.id}
                    settlement={settlement}
                    index={idx}
                    isUndoing={undoingId === settlement.id}
                    onUndo={() => handleUndo(settlement)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Actions ── */}
          <div className="flex flex-col gap-2.5 pt-1">
            {!isSettled && (
              <Button
                onClick={() => {
                  onOpenChange(false);
                  onOpenSettle(due);
                }}
                className={cn(
                  "w-full h-12 font-bold text-base gap-2 rounded-full shadow-md",
                  isLent
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                    : "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
                )}
              >
                <CheckCircle2 className="size-5" />
                Record Settlement · {formatCurrency(remaining)}
              </Button>
            )}

            {due.status === "open" && (!due.settlements || due.settlements.length === 0) && (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full h-10 rounded-2xl text-destructive border-destructive/30 hover:bg-destructive/8 hover:text-destructive font-semibold"
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 size-4" />
                )}
                Delete Due
              </Button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}

// ── Settlement row sub-component ──
function SettlementRow({
  settlement,
  index,
  isUndoing,
  onUndo,
}: {
  settlement: DebtSettlement;
  index: number;
  isUndoing: boolean;
  onUndo: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/80 px-4 py-3 backdrop-blur-sm">
      {/* Badge number */}
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <span className="text-[0.6rem] font-black">#{index + 1}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-black tabular-nums text-foreground">
            {formatCurrency(settlement.amount)}
          </span>
          {settlement.paymentMethod && (
            <Badge variant="outline" className="text-[0.55rem] px-1.5 py-0 h-4 rounded-full">
              {PAYMENT_LABELS[settlement.paymentMethod]}
            </Badge>
          )}
        </div>
        <p className="text-[0.65rem] text-muted-foreground mt-0.5 truncate">
          {formatRelativeCompact(settlement.date)}
          {settlement.note ? ` · ${settlement.note}` : ""}
        </p>
      </div>

      {/* Undo */}
      <button
        type="button"
        onClick={onUndo}
        disabled={isUndoing}
        className="flex items-center gap-1 rounded-xl border border-destructive/25 bg-destructive/5 px-2.5 py-1.5 text-[0.65rem] font-semibold text-destructive transition-all hover:bg-destructive/15 active:scale-95 disabled:opacity-50 shrink-0"
      >
        {isUndoing ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Undo2 className="size-3" />
        )}
        Undo
      </button>
    </div>
  );
}

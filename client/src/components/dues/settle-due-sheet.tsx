import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  PartyPopper,
  Wallet,
  Zap,
} from "lucide-react";
import type { Debt, PaymentMethod } from "@ledg/shared";
import { PAYMENT_LABELS } from "@ledg/shared";

import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { useSettleDue } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface SettleDueSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  due: Debt | null;
  onSettled?: () => void;
}

const PAYMENT_ICONS: Record<PaymentMethod, typeof Banknote> = {
  cash: Banknote,
  card: CreditCard,
  bank_transfer: Landmark,
  wallet: Wallet,
};

export function SettleDueSheet({
  open,
  onOpenChange,
  due,
  onSettled,
}: SettleDueSheetProps) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => toLocalISODate(new Date()));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");

  const settleMutation = useSettleDue();

  const remaining = due ? Math.max(0, due.principal - (due.settledAmount ?? 0)) : 0;
  const progressPercent =
    due && due.principal > 0
      ? Math.min(100, Math.round(((due.settledAmount ?? 0) / due.principal) * 100))
      : 0;

  useEffect(() => {
    if (open && due) {
      setAmount(remaining.toString());
      setDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod("cash");
      setNote("");
    }
  }, [open, due, remaining]);

  if (!due) return null;

  const isLent = due.direction === "lent";
  const numAmount = parseFloat(amount) || 0;
  const isFullPayment = numAmount >= remaining - 0.001;
  const newSettled = (due.settledAmount ?? 0) + numAmount;
  const newProgress =
    due.principal > 0
      ? Math.min(100, Math.round((newSettled / due.principal) * 100))
      : 0;

  const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid settlement amount");
      return;
    }
    if (numAmount > remaining + 0.001) {
      toast.error(`Cannot exceed remaining balance of ${formatCurrency(remaining)}`);
      return;
    }

    try {
      await settleMutation.mutateAsync({
        id: due.id,
        data: {
          amount: numAmount,
          date: new Date(date).toISOString(),
          paymentMethod,
          note: note.trim(),
        },
      });

      toast.success(
        isFullPayment
          ? `🎉 Fully settled with ${due.counterparty.name}!`
          : `Recorded ${formatCurrency(numAmount)} from ${due.counterparty.name}`
      );
      onSettled?.();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record settlement";
      toast.error(msg);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={isLent ? "Record Repayment" : "Record Payment"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-0">
        {/* ── Header context ── */}
        <div className="flex items-center gap-3 mb-5 rounded-3xl bg-muted/40 border border-border/40 p-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CheckCircle2 className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground leading-tight">
              {isLent ? "Record Repayment" : "Record Payment"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {isLent ? "Money received from" : "Money paid to"}{" "}
              <span className="font-semibold text-foreground">{due.counterparty.name}</span>
            </p>
          </div>
        </div>

        {/* ── Balance overview ── */}
        <div className="mb-5 rounded-3xl border border-border/50 bg-card overflow-hidden">
          {/* 3-column stats */}
          <div className="grid grid-cols-3 divide-x divide-border/40">
            <div className="p-3 text-center">
              <p className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Principal
              </p>
              <p className="text-sm font-bold tabular-nums text-muted-foreground">
                {formatCurrency(due.principal)}
              </p>
            </div>
            <div className="p-3 text-center">
              <p className="text-[0.6rem] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                Settled
              </p>
              <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatCurrency(due.settledAmount ?? 0)}
              </p>
            </div>
            <div className="p-3 text-center">
              <p className="text-[0.6rem] font-bold uppercase tracking-wider text-primary mb-1">
                Remaining
              </p>
              <p className="text-lg font-black tabular-nums text-primary">
                {formatCurrency(remaining)}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="px-4 pb-3 pt-1">
            <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
              {/* Already settled */}
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
              {/* Preview new settlement */}
              {numAmount > 0 && !isFullPayment && (
                <div
                  className="absolute top-0 h-full rounded-full bg-primary/50 transition-all duration-300"
                  style={{ left: `${progressPercent}%`, width: `${newProgress - progressPercent}%` }}
                />
              )}
            </div>
            <div className="flex justify-between mt-1.5 text-[0.6rem] text-muted-foreground">
              <span className="tabular-nums">{progressPercent}% settled</span>
              {numAmount > 0 && (
                <span className="tabular-nums text-primary font-semibold">
                  → {newProgress}% after this
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Amount input ── */}
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center justify-between">
            <label className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-wider">
              Settlement Amount <span className="text-destructive">*</span>
            </label>
            <button
              type="button"
              onClick={() => setAmount(remaining.toString())}
              className="flex items-center gap-1 text-[0.68rem] font-bold text-primary hover:underline transition-all"
            >
              <Zap className="size-3" />
              Full ({formatCurrency(remaining)})
            </button>
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-muted-foreground/60 pointer-events-none">
              Rs.
            </span>
            <input
              type="number"
              step="any"
              min="0.01"
              max={remaining}
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full rounded-2xl border border-border/60 bg-card pl-16 pr-4 py-4 text-2xl font-black tabular-nums tracking-tight outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30"
            />
          </div>

          {/* Quick amount chips */}
          <div className="flex gap-1.5 flex-wrap">
            {QUICK_AMOUNTS.map((inc) => {
              if (inc >= remaining) return null;
              const target = Math.min(remaining, Math.round((numAmount + inc) * 100) / 100);
              return (
                <button
                  key={inc}
                  type="button"
                  onClick={() => setAmount(target.toString())}
                  className="rounded-full border border-border/60 bg-muted/50 px-3 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-muted active:scale-95"
                >
                  +{inc.toLocaleString()}
                </button>
              );
            })}
            {remaining > 0 && (
              <button
                type="button"
                onClick={() => setAmount(remaining.toString())}
                className="rounded-full border border-primary/30 bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/15 active:scale-95"
              >
                Full
              </button>
            )}
          </div>
        </div>

        {/* ── Settlement Date ── */}
        <div className="flex flex-col gap-2 mb-5">
          <label className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-wider">
            Date
          </label>
          <DatePicker
            value={date}
            onChange={(d) => setDate(d || new Date().toISOString().slice(0, 10))}
          />
        </div>

        {/* ── Payment Method ── */}
        <div className="flex flex-col gap-2 mb-5">
          <label className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-wider">
            Via
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(["cash", "wallet", "bank_transfer", "card"] as PaymentMethod[]).map((method) => {
              const Icon = PAYMENT_ICONS[method];
              const selected = paymentMethod === method;
              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border p-3 text-[0.65rem] font-semibold transition-all",
                    selected
                      ? "border-primary bg-primary/8 text-primary shadow-sm"
                      : "border-border/50 bg-muted/25 text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className={cn("size-4.5", selected ? "text-primary" : "text-muted-foreground")} />
                  <span className="truncate w-full text-center leading-tight">{PAYMENT_LABELS[method]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Note ── */}
        <div className="flex flex-col gap-2 mb-6">
          <label className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-wider">
            Note <span className="text-muted-foreground/50 font-normal normal-case text-[0.65rem]">(optional)</span>
          </label>
          <input
            placeholder="e.g. Paid via eSewa / cash in hand..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            className="w-full rounded-2xl border border-border/60 bg-card px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40"
          />
        </div>

        {/* ── Submit ── */}
        <Button
          type="submit"
          className={cn(
            "w-full h-13 font-bold text-base gap-2.5 rounded-full shadow-md",
            isFullPayment
              ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25"
              : "shadow-primary/20"
          )}
          disabled={settleMutation.isPending}
        >
          {settleMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Recording...
            </>
          ) : isFullPayment ? (
            <>
              <PartyPopper className="size-5" />
              Settle Fully · {formatCurrency(numAmount || remaining)}
            </>
          ) : (
            <>
              <CheckCircle2 className="size-5" />
              Record {numAmount > 0 ? formatCurrency(numAmount) : "Settlement"}
            </>
          )}
        </Button>
      </form>
    </Sheet>
  );
}

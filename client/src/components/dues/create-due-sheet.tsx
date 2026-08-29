import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CreditCard,
  Landmark,
  Loader2,
  Phone,
  User,
  Wallet,
  X,
} from "lucide-react";
import type { DebtDirection, PaymentMethod, Space } from "@ledg/shared";
import { PAYMENT_LABELS } from "@ledg/shared";

import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateDue, useDuesSummary, useSpaces } from "@/lib/queries";
import { cn } from "@/lib/utils";

interface CreateDueSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDirection?: DebtDirection;
  defaultPerson?: string;
  defaultPhone?: string;
}

const PAYMENT_ICONS: Record<PaymentMethod, typeof Banknote> = {
  cash: Banknote,
  card: CreditCard,
  bank_transfer: Landmark,
  wallet: Wallet,
};

function getQuickDates(): { label: string; date: string }[] {
  const today = new Date();
  const fmtLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const addDays = (d: Date, n: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  };
  return [
    { label: "Today", date: fmtLocal(today) },
    { label: "Tomorrow", date: fmtLocal(addDays(today, 1)) },
    { label: "Next week", date: fmtLocal(addDays(today, 7)) },
    { label: "Next month", date: fmtLocal(addDays(today, 30)) },
  ];
}

export function CreateDueSheet({
  open,
  onOpenChange,
  defaultDirection = "lent",
  defaultPerson = "",
  defaultPhone = "",
}: CreateDueSheetProps) {
  const [direction, setDirection] = useState<DebtDirection>(defaultDirection);
  const [name, setName] = useState(defaultPerson);
  const [phone, setPhone] = useState(defaultPhone);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");
  const [spaceId, setSpaceId] = useState("");

  const { data: spaces = [] } = useSpaces();
  const { data: duesSummary } = useDuesSummary();
  const createMutation = useCreateDue();

  const quickDates = getQuickDates();

  useEffect(() => {
    if (open) {
      setDirection(defaultDirection);
      setName(defaultPerson);
      setPhone(defaultPhone);
      setAmount("");
      setDate(() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      });
      setDueDate(null);
      setPaymentMethod("cash");
      setNote("");

      const personalSpace = spaces.find((s: Space) => s.type === "personal") ?? spaces[0];
      if (personalSpace) setSpaceId(personalSpace.id);
    }
  }, [open, defaultDirection, defaultPerson, defaultPhone, spaces]);

  const recentNames = (duesSummary?.byPerson ?? [])
    .map((p) => p.name)
    .filter((n) => n.toLowerCase() !== name.toLowerCase());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Please enter a person name");
      return;
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    try {
      await createMutation.mutateAsync({
        direction,
        counterparty: { name: trimmedName, phone: phone.trim() || undefined },
        principal: numAmount,
        date,
        dueDate: dueDate || null,
        paymentMethod,
        note: note.trim(),
        spaceId: spaceId || undefined,
      });

      toast.success(
        direction === "lent"
          ? `Lent Rs. ${numAmount.toLocaleString()} to ${trimmedName}`
          : `Borrowed Rs. ${numAmount.toLocaleString()} from ${trimmedName}`
      );
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record due";
      toast.error(msg);
    }
  };

  const isLent = direction === "lent";

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-0">
        {/* ── Direction toggle (hero pill) ── */}
        <div className="flex gap-2 mb-6 p-1 rounded-3xl bg-muted/50 border border-border/40">
          {([
            { value: "lent" as const, label: "I Lent", Icon: ArrowUpRight, color: "bg-emerald-600 text-white shadow-emerald-600/30" },
            { value: "borrowed" as const, label: "I Borrowed", Icon: ArrowDownLeft, color: "bg-amber-500 text-white shadow-amber-500/30" },
          ]).map(({ value, label, Icon, color }) => (
            <button
              key={value}
              type="button"
              onClick={() => setDirection(value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all duration-200",
                direction === value
                  ? `${color} shadow-md`
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Context label ── */}
        <div className={cn(
          "rounded-2xl px-4 py-3 mb-5 flex items-center gap-3",
          isLent ? "bg-emerald-500/8 border border-emerald-500/15" : "bg-amber-500/8 border border-amber-500/15"
        )}>
          <div className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-xl",
            isLent ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
          )}>
            {isLent ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">
              {isLent ? "Recording money you lent" : "Recording money you borrowed"}
            </p>
            <p className="text-[0.68rem] text-muted-foreground mt-0.5">
              {isLent ? "They owe you · creates an expense transaction" : "You owe them · creates an income transaction"}
            </p>
          </div>
        </div>

        {/* ── Amount ── */}
        <div className="flex flex-col gap-2 mb-5">
          <label className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-wider">
            Amount <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-muted-foreground/60 pointer-events-none">
              Rs.
            </span>
            <input
              type="number"
              step="any"
              min="0.01"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
              className="w-full rounded-2xl border border-border/60 bg-card pl-16 pr-4 py-4 text-3xl font-black tabular-nums tracking-tight outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30"
            />
          </div>
        </div>

        {/* ── Person ── */}
        <div className="flex flex-col gap-2 mb-5">
          <label className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-wider">
            {isLent ? "Lent to" : "Borrowed from"} <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
            <Input
              placeholder="Person's name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-10 h-11 rounded-2xl"
              required
            />
          </div>
          {/* Recent names */}
          {recentNames.length > 0 && !name && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {recentNames.slice(0, 5).map((rName) => (
                <button
                  key={rName}
                  type="button"
                  onClick={() => setName(rName)}
                  className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground active:scale-95"
                >
                  {rName}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Phone (optional) ── */}
        <div className="flex flex-col gap-2 mb-5">
          <label className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-wider">
            Phone <span className="text-muted-foreground/50 font-normal normal-case text-[0.65rem]">(optional)</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
            <Input
              type="tel"
              placeholder="e.g. 9841234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="pl-10 h-11 rounded-2xl"
            />
          </div>
        </div>

        {/* ── Date Given ── */}
        <div className="flex flex-col gap-2 mb-5">
          <label className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-wider">
            Date
          </label>
          <div className="flex gap-1.5 flex-wrap mb-1.5">
            {quickDates.map((qd) => (
              <button
                key={qd.label}
                type="button"
                onClick={() => setDate(qd.date)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                  date === qd.date
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                {qd.label}
              </button>
            ))}
          </div>
          <DatePicker
            value={date}
            onChange={(d) => {
              if (d) {
                setDate(d);
              }
            }}
          />
        </div>

        {/* ── Due Date ── */}
        <div className="flex flex-col gap-2 mb-5">
          <div className="flex items-center justify-between">
            <label className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              Due Date
              <span className="text-muted-foreground/50 font-normal normal-case text-[0.65rem]">(optional)</span>
            </label>
            {dueDate && (
              <button
                type="button"
                onClick={() => setDueDate(null)}
                className="flex items-center gap-0.5 text-[0.68rem] text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-3" />Clear
              </button>
            )}
          </div>
          <DatePicker
            value={dueDate ?? ""}
            onChange={(d) => setDueDate(d || null)}
            placeholder="Set a repayment reminder"
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

        {/* ── Space (if multiple) ── */}
        {spaces.length > 1 && (
          <div className="flex flex-col gap-2 mb-5">
            <label className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-wider">
              Ledger Space
            </label>
            <Select value={spaceId} onValueChange={setSpaceId}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue placeholder="Select space" />
              </SelectTrigger>
              <SelectContent>
                {spaces.map((s: Space) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* ── Note ── */}
        <div className="flex flex-col gap-2 mb-6">
          <label className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-wider">
            Note <span className="text-muted-foreground/50 font-normal normal-case text-[0.65rem]">(optional)</span>
          </label>
          <Input
            placeholder="e.g. For trip / dinner bills..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            className="h-11 rounded-2xl"
          />
        </div>

        {/* ── Submit ── */}
        <Button
          type="submit"
          className={cn(
            "w-full h-13 font-bold text-base gap-2.5 rounded-full shadow-md transition-all",
            isLent
              ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25"
              : "bg-amber-500 hover:bg-amber-600 shadow-amber-500/25"
          )}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              {isLent ? <ArrowUpRight className="size-5" /> : <ArrowDownLeft className="size-5" />}
              {isLent ? "Record Lending" : "Record Borrowing"}
            </>
          )}
        </Button>
      </form>
    </Sheet>
  );
}

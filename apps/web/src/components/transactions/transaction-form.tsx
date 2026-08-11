import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PaymentMethod, Space, TransactionInput } from "@ledg/shared";
import {
  PAYMENT_METHODS,
  TRANSACTION_TYPES,
  type TransactionType,
} from "@ledg/shared";
import { toast } from "sonner";
import {
  Calendar,
  HandCoins,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Segmented } from "@/components/ui/segmented";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import {
  useCreateTransaction,
  useUpdateTransaction,
} from "@/lib/queries";
import { useTransactionForm } from "@/lib/transaction-form";

interface TransactionFormProps {
  spaces: Space[];
  currency?: string;
}

const TYPE_OPTIONS = TRANSACTION_TYPES.map((t) => ({ value: t, label: t }));

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  bank_transfer: "Bank",
  other: "Other",
};

export function TransactionForm({ spaces, currency }: TransactionFormProps) {
  const { formState, closeForm, defaultInput } = useTransactionForm();
  const editing = formState.editing;
  const isOpen = formState.open;

  const [type, setType] = useState<TransactionType>("expense");
  const [category, setCategory] = useState("Food");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [space, setSpace] = useState("");
  const navigate = useNavigate();

  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();

  const safeSpaces = spaces.length > 0 ? spaces : [];
  const defaultSpaceId =
    formState.preselectedSpaceId ??
    safeSpaces.find((s) => s.type === "personal")?.id ??
    safeSpaces[0]?.id ??
    "";
  const activeSpaceId = space || defaultSpaceId;

  useEffect(() => {
    if (!isOpen) return;

    setSpace("");

    if (editing) {
      setType(editing.type);
      setCategory(editing.category);
      setAmount(String(editing.amount));
      setNote(editing.note ?? "");
      setDate(editing.date.slice(0, 10));
      setPaymentMethod(editing.paymentMethod ?? "cash");
    } else {
      const defaults = defaultInput(spaces);
      setType(defaults.type);
      setCategory(defaults.category);
      setAmount("");
      setNote("");
      setDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod(defaults.paymentMethod ?? "cash");
    }
  }, [isOpen, editing, spaces]);

  const handleTypeChange = (value: TransactionType) => {
    setType(value);
    const meta = CATEGORIES.find(
      (c) => c.defaultsTo === value
    );
    if (meta) setCategory(meta.name);
  };

  const submit = async () => {
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!activeSpaceId) {
      toast.error("Create a space first");
      return;
    }
    if (!category) {
      toast.error("Pick a category");
      return;
    }

    const payload: TransactionInput = {
      type,
      category,
      amount: parsedAmount,
      note: note.trim(),
      date: new Date(date + "T00:00:00Z").toISOString(),
      tags: [],
      paymentMethod,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({
          spaceId: activeSpaceId,
          id: editing.id,
          data: payload,
        });
      } else {
        await createMutation.mutateAsync({
          spaceId: activeSpaceId,
          data: payload,
        });
      }
      toast.success(editing ? "Transaction updated" : "Transaction added");
      closeForm();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    }
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(o) => !o && closeForm()}
      title={editing ? "Edit transaction" : "Add transaction"}
      description="Less than five seconds, promise."
    >
      <div className="flex flex-col gap-5">
        <div role="group" aria-labelledby="type-label">
          <span id="type-label" className="sr-only">
            Transaction type
          </span>
          <Segmented
            options={TYPE_OPTIONS}
            value={type}
            onChange={handleTypeChange}
          />
        </div>

        <div className="rounded-4xl bg-muted/70 p-5">
          <label htmlFor="amount" className="sr-only">
            Amount
          </label>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-muted-foreground">
              {currency === "USD" ? "$" : "₹"}
            </span>
            <input
              id="amount"
              inputMode="decimal"
              placeholder="0"
              autoFocus
              value={amount}
              onChange={(e) =>
                setAmount(
                  e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
                )
              }
              className="w-full bg-transparent text-5xl font-extrabold tracking-tight outline-none placeholder:text-muted-foreground/40"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[100, 250, 500, 1000, 5000].map((quick) => (
              <button
                key={quick}
                type="button"
                onClick={() => setAmount((prev) =>
                  prev ? String(Number(prev) + quick) : String(quick)
                )}
                className="rounded-full bg-card px-3.5 py-1.5 text-sm font-medium text-muted-foreground shadow-xs transition-colors hover:text-foreground"
              >
                +{currency === "USD" ? "$" : "₹"}
                {quick}
              </button>
            ))}
          </div>
        </div>

        <div role="group" aria-labelledby="category-label">
          <p id="category-label" className="mb-2 text-sm font-medium">
            Category
          </p>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((meta) => {
              const Icon = meta.icon;
              const active = category === meta.name;
              return (
                <button
                  key={meta.name}
                  type="button"
                  onClick={() => setCategory(meta.name)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-3xl px-2 py-3 text-center transition-all",
                    active
                      ? "bg-accent/80 text-foreground shadow-sm"
                      : "bg-card text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon
                    className="size-6"
                    style={{ color: meta.color }}
                    strokeWidth={active ? 2.4 : 2}
                  />
                  <span className="text-[0.7rem] font-medium leading-tight">
                    {meta.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="note" className="text-sm font-medium">
            Note
          </label>
          <Input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Coffee with Sara"
            maxLength={500}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="date" className="text-sm font-medium">
              Date
            </label>
            <label className="relative block">
              <Calendar className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="pl-10"
              />
            </label>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="space" className="text-sm font-medium">
              Space
            </label>
            <label className="relative block">
              <Wallet className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <select
                id="space"
                value={activeSpaceId}
                onChange={(e) => {
                  if (e.target.value === "__new__") {
                    closeForm();
                    navigate("/spaces");
                    return;
                  }
                  setSpace(e.target.value);
                }}
                className="h-12 w-full appearance-none rounded-2xl border border-input bg-card pl-10 pr-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {safeSpaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
                <option value="__new__">+ New space…</option>
              </select>
            </label>
          </div>
        </div>

        <div role="group" aria-labelledby="payment-label">
          <p id="payment-label" className="text-sm font-medium">Payment</p>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all",
                  paymentMethod === method
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <HandCoins className="size-4" />
                {PAYMENT_LABELS[method]}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={submit}
          size="lg"
          className="mt-1 w-full text-base"
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {editing ? "Save changes" : "Add transaction"}
        </Button>
      </div>
    </Sheet>
  );
}

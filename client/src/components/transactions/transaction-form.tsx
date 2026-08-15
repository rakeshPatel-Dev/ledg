import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PaymentMethod, Space, TransactionInput } from "@ledg/shared";
import {
  PAYMENT_METHODS,
  TRANSACTION_TYPES,
  transactionSchema,
  type TransactionType,
} from "@ledg/shared";
import { toast } from "sonner";
import {
  HandCoins,
  Wallet,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Segmented } from "@/components/ui/segmented";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    editing?.spaceId ??
    formState.preselectedSpaceId ??
    safeSpaces.find((s) => s.type === "personal")?.id ??
    safeSpaces[0]?.id ??
    "";
  const activeSpaceId = space || defaultSpaceId;

  useEffect(() => {
    if (!isOpen) return;

    if (editing) {
      setType(editing.type);
      setCategory(editing.category);
      setAmount(String(editing.amount));
      setNote(editing.note ?? "");
      setDate(editing.date.slice(0, 10));
      setPaymentMethod(editing.paymentMethod ?? "cash");
      setSpace(editing.spaceId || formState.preselectedSpaceId || "");
    } else {
      setSpace(formState.preselectedSpaceId || "");
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

    const payload: TransactionInput = {
      type,
      category,
      amount: parsedAmount,
      note: note.trim(),
      date: new Date(date + "T00:00:00Z").toISOString(),
      tags: [],
      paymentMethod,
    };

    const parsed = transactionSchema.safeParse(payload);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path = issue.path.join(".");
      const fieldLabel: Record<string, string> = {
        category: "Category",
        type: "Type",
        amount: "Amount",
        note: "Note",
        date: "Date",
        tags: "Tags",
        paymentMethod: "Payment method",
      };
      const label = path ? fieldLabel[path] ?? path : "";
      toast.error(label ? `${label}: ${issue.message}` : issue.message);
      return;
    }

    try {
      if (editing) {
        await updateMutation.mutateAsync({
          spaceId: editing.spaceId || activeSpaceId,
          id: editing.id,
          data: parsed.data,
        });
      } else {
        await createMutation.mutateAsync({
          spaceId: activeSpaceId,
          data: parsed.data,
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
              {currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "Rs."}
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
                +{currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "Rs."}
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
                  title={meta.name}
                  onClick={() => setCategory(meta.name)}
                  className={cn(
                    "flex min-w-0 w-full flex-col items-center justify-center gap-1.5 rounded-2xl p-2.5 text-center transition-all overflow-hidden border border-white/10",
                    active
                      ? "bg-accent/80 text-foreground shadow-sm border-white/25"
                      : "bg-card/75 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon
                    className="size-5 shrink-0"
                    style={{ color: meta.color }}
                    strokeWidth={active ? 2.4 : 2}
                  />
                  <span className="w-full truncate text-[0.65rem] font-medium leading-none tracking-tight text-center block">
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
          <div className="space-y-1.5 min-w-0">
            <label className="text-sm font-medium">
              Date
            </label>
            <DatePicker
              value={date}
              onChange={(val) => setDate(val)}
            />
          </div>
          <div className="space-y-1.5 min-w-0">
            <label className="text-sm font-medium">
              Space
            </label>
            <Select
              value={activeSpaceId}
              onValueChange={(val) => {
                if (!val) return;
                if (val === "__new__") {
                  closeForm();
                  navigate("/spaces");
                  return;
                }
                setSpace(val);
              }}
            >
              <SelectTrigger className="relative pl-10">
                <Wallet className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <SelectValue placeholder="Select space">
                  {safeSpaces.find((s) => s.id === activeSpaceId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {safeSpaces.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
                <SelectSeparator />
                <SelectItem value="__new__" className="font-medium text-primary">
                  + New space…
                </SelectItem>
              </SelectContent>
            </Select>
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
          {createMutation.isPending || updateMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {editing ? "Saving…" : "Adding…"}
            </>
          ) : editing ? (
            "Save changes"
          ) : (
            "Add transaction"
          )}
        </Button>
      </div>
    </Sheet>
  );
}

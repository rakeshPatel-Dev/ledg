import { useEffect, useMemo, useRef, useState } from "react";
import type {
  PaymentMethod,
  Space,
  SpaceType,
  Transaction,
  TransactionInput,
} from "@ledg/shared";
import {
  PAYMENT_LABELS,
  PAYMENT_METHODS,
  SPACE_TYPES,
  TRANSACTION_TYPES,
  transactionSchema,
  type TransactionType,
} from "@ledg/shared";
import { toast } from "sonner";
import {
  Banknote,
  CreditCard,
  Landmark,
  Wallet,
  Loader2,
  Check,
  Plus,
  RotateCcw,
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
import { getCategoriesByType, getCategoryMeta } from "@/lib/categories";
import { getUserFacingError } from "@/lib/errors";
import { formatCurrency, localDateKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  useCreateSpace,
  useCreateTransaction,
  useDashboardSummary,
  useUpdateTransaction,
} from "@/lib/queries";
import { useTransactionForm } from "@/lib/transaction-form";

interface TransactionFormProps {
  spaces: Space[];
}

type FieldErrors = Partial<
  Record<
    "amount" | "space" | "category" | "date" | "note" | "type" | "paymentMethod",
    string
  >
>;

const TYPE_OPTIONS = TRANSACTION_TYPES.map((t) => ({ value: t, label: t }));

const SPACE_TYPE_OPTIONS = SPACE_TYPES.map((t) => ({
  value: t,
  label: t.charAt(0).toUpperCase() + t.slice(1),
}));

const PAYMENT_ICONS: Record<PaymentMethod, typeof Banknote> = {
  cash: Banknote,
  card: CreditCard,
  bank_transfer: Landmark,
  wallet: Wallet,
};

export function TransactionForm({ spaces }: TransactionFormProps) {
  const { formState, closeForm, defaultInput } = useTransactionForm();
  const editing = formState.editing;
  const isOpen = formState.open;

  const [type, setType] = useState<TransactionType>("expense");
  const [category, setCategory] = useState("Food");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [space, setSpace] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const amountRef = useRef<HTMLInputElement>(null);
  const spaceRef = useRef<HTMLButtonElement>(null);

  // "New space" runs inside the transaction sheet so nothing typed is lost.
  const [newSpaceOpen, setNewSpaceOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceType, setNewSpaceType] = useState<SpaceType>("personal");
  const [newSpaceError, setNewSpaceError] = useState<string | null>(null);

  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const createSpaceMutation = useCreateSpace();
  const dashboardQ = useDashboardSummary();

  // "Repeat last" reuses the dashboard's recent transactions — no template
  // collection, no extra request. Deduplicate so the chips stay useful.
  const repeatCandidates = useMemo(() => {
    const recent = dashboardQ.data?.recentTransactions ?? [];
    const seen = new Set<string>();
    const candidates: Transaction[] = [];

    for (const tx of recent) {
      // Loans are not spending/income, so they are not useful repeat templates.
      if (tx.source === "dues") continue;
      const fingerprint = [
        tx.type,
        tx.category,
        tx.amount,
        tx.note,
        tx.paymentMethod ?? "",
        tx.spaceId,
      ].join("|");
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);
      candidates.push(tx);
      if (candidates.length === 3) break;
    }

    return candidates;
  }, [dashboardQ.data]);

  const safeSpaces = spaces.length > 0 ? spaces : [];
  const defaultSpaceId =
    editing?.spaceId ??
    formState.preselectedSpaceId ??
    safeSpaces.find((s) => s.type === "personal")?.id ??
    safeSpaces[0]?.id ??
    "";
  const activeSpaceId = space || defaultSpaceId;
  const selectedSpaceName = safeSpaces.find((s) => s.id === activeSpaceId)?.name;

  const activeCategories = useMemo(
    () => getCategoriesByType(type, editing?.source === "dues"),
    [type, editing]
  );

  const quickDates = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const fmt = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    return [
      { label: "Today", value: fmt(today) },
      { label: "Yesterday", value: fmt(yesterday) },
      { label: "2 days ago", value: fmt(twoDaysAgo) },
    ];
  }, []);

  useEffect(() => {
    if (!isOpen) {
      // Never leave the nested sheet open behind a closed transaction form.
      setNewSpaceOpen(false);
      setNewSpaceError(null);
      setNewSpaceName("");
      setNewSpaceType("personal");
      return;
    }

    if (editing) {
      setType(editing.type);
      setCategory(editing.category);
      setAmount(String(editing.amount));
      setNote(editing.note ?? "");
      setDate(
        editing.date ? editing.date.slice(0, 10) : new Date().toISOString().slice(0, 10)
      );
      setPaymentMethod(editing.paymentMethod ?? "cash");
      setSpace(editing.spaceId || formState.preselectedSpaceId || "");
    } else {
      const initialSpace =
        formState.preselectedSpaceId ||
        safeSpaces.find((s) => s.type === "personal")?.id ||
        safeSpaces[0]?.id ||
        "";
      setSpace(initialSpace);
      const defaults = defaultInput(spaces);
      setType(defaults.type);
      setCategory(defaults.category);
      setAmount("");
      setNote("");
      setDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod(defaults.paymentMethod ?? "cash");
    }
    setFieldErrors({});
    setNewSpaceOpen(false);
    setNewSpaceError(null);
  }, [isOpen, editing?.id]);

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleTypeChange = (value: TransactionType) => {
    setType(value);
    clearFieldError("type");
    const available = getCategoriesByType(value);
    if (!available.some((c) => c.name === category)) {
      setCategory(available[0]?.name ?? "Other");
      clearFieldError("category");
    }
  };

  const repeatTransaction = (tx: Transaction) => {
    setType(tx.type);
    setCategory(tx.category);
    setAmount(String(tx.amount));
    setNote(tx.note ?? "");
    setPaymentMethod(tx.paymentMethod ?? "cash");
    if (safeSpaces.some((s) => s.id === tx.spaceId)) {
      setSpace(tx.spaceId);
    }
    // A repeat is a new entry, so always log it against today.
    setDate(localDateKey(new Date()));
    setFieldErrors({});
  };

  const parsedAmountValue = Number(amount);
  const hasValidAmount =
    amount.trim().length > 0 &&
    Number.isFinite(parsedAmountValue) &&
    parsedAmountValue > 0;
  const canSubmit = hasValidAmount && Boolean(activeSpaceId);
  const footerHint = !amount.trim()
    ? "Enter an amount to continue."
    : !hasValidAmount
      ? "Enter an amount greater than zero."
      : !activeSpaceId
        ? "Choose a space to continue."
        : null;

  const submit = async () => {
    const nextErrors: FieldErrors = {};

    if (!hasValidAmount) {
      nextErrors.amount = "Enter an amount greater than zero.";
    }
    if (!activeSpaceId) {
      nextErrors.space = "Choose a space for this transaction.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      if (nextErrors.amount) {
        amountRef.current?.focus();
      } else if (nextErrors.space) {
        spaceRef.current?.focus();
      }
      return;
    }

    const payload: TransactionInput = {
      type,
      category,
      amount: parsedAmountValue,
      note: note.trim(),
      date: new Date(date + "T00:00:00").toISOString(),
      paymentMethod,
      source: editing?.source ?? "manual",
    };

    const parsed = transactionSchema.safeParse(payload);
    if (!parsed.success) {
      const schemaErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !(field in schemaErrors)) {
          schemaErrors[field as keyof FieldErrors] = issue.message;
        }
      }
      setFieldErrors(schemaErrors);
      if (schemaErrors.amount) amountRef.current?.focus();
      return;
    }

    setFieldErrors({});

    try {
      if (editing) {
        const sourceSpaceId =
          editing.spaceId || formState.preselectedSpaceId || activeSpaceId;
        await updateMutation.mutateAsync({
          spaceId: sourceSpaceId,
          newSpaceId: activeSpaceId,
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
      toast.error(
        getUserFacingError(error, "Couldn't save the transaction. Please try again.")
      );
    }
  };

  const handleCreateSpace = async () => {
    const name = newSpaceName.trim();
    if (!name) {
      setNewSpaceError("Enter a name for the space.");
      return;
    }

    setNewSpaceError(null);
    try {
      const created = await createSpaceMutation.mutateAsync({
        name,
        type: newSpaceType,
        monthlyBudget: null,
      });
      setSpace(created.space.id);
      setNewSpaceOpen(false);
      setNewSpaceName("");
      setNewSpaceType("personal");
      toast.success(`Created "${created.space.name}"`);
    } catch (error) {
      setNewSpaceError(
        getUserFacingError(error, "Couldn't create the space. Try again.")
      );
    }
  };

  return (
    <>
      <Sheet
        open={isOpen}
        onOpenChange={(o) => !o && closeForm()}
        title={editing ? "Edit transaction" : "Add transaction"}
        description="Less than five seconds, promise."
        footer={
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate text-muted-foreground">
                {category}
                {selectedSpaceName ? ` · ${selectedSpaceName}` : ""}
              </span>
              <span className="shrink-0 font-bold tabular-nums text-foreground">
                {hasValidAmount ? formatCurrency(parsedAmountValue) : "—"}
              </span>
            </div>
            {footerHint ? (
              <p className="text-[11px] text-muted-foreground">{footerHint}</p>
            ) : null}
            <Button
              onClick={submit}
              size="lg"
              className="w-full text-base"
              disabled={
                createMutation.isPending || updateMutation.isPending || !canSubmit
              }
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {editing ? "Saving…" : "Adding…"}
                </>
              ) : editing ? (
                <>
                  <Check className="size-4 mr-2" />
                  Save changes
                </>
              ) : (
                <>
                  <Plus className="size-4 mr-2" />
                  Add transaction
                </>
              )}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <div role="group" aria-labelledby="type-label">
            <span id="type-label" className="sr-only">
              Transaction type
            </span>
            <Segmented options={TYPE_OPTIONS} value={type} onChange={handleTypeChange} />
          </div>

          {editing?.source === "dues" && (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
              This entry came from a due. Changing it here will not update the due. Manage
              the loan from <span className="font-semibold">Dues</span>.
            </div>
          )}

          {!editing && repeatCandidates.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <RotateCcw className="size-3.5" />
                Repeat a recent transaction
              </p>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {repeatCandidates.map((tx) => {
                  const meta = getCategoryMeta(tx.category, tx.type);
                  const Icon = meta.icon;

                  return (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => repeatTransaction(tx)}
                      className="flex shrink-0 items-center gap-2 rounded-full border border-border/60 bg-card/75 px-3 py-2 text-left transition-colors hover:bg-accent/60 cursor-pointer"
                    >
                      <Icon className="size-4 shrink-0" style={{ color: meta.color }} />
                      <span className="min-w-0">
                        <span className="block max-w-[9rem] truncate text-xs font-semibold">
                          {tx.note || tx.category}
                        </span>
                        <span className="block text-[10px] text-muted-foreground tabular-nums">
                          {formatCurrency(tx.amount)} · {tx.category}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div
              className={cn(
                "rounded-4xl bg-muted/70 p-5 transition-shadow",
                fieldErrors.amount &&
                  "ring-2 ring-destructive/60 ring-offset-2 ring-offset-card"
              )}
            >
              <label htmlFor="amount" className="sr-only">
                Amount
              </label>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-muted-foreground">Rs. </span>
                <input
                  id="amount"
                  ref={amountRef}
                  inputMode="decimal"
                  placeholder="0"
                  autoFocus
                  value={amount}
                  aria-invalid={Boolean(fieldErrors.amount)}
                  aria-describedby={fieldErrors.amount ? "amount-error" : undefined}
                  onChange={(e) => {
                    setAmount(
                      e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
                    );
                    clearFieldError("amount");
                  }}
                  onBlur={() => {
                    if (amount.trim() && !hasValidAmount) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        amount: "Enter an amount greater than zero.",
                      }));
                    }
                  }}
                  className="w-full bg-transparent text-5xl font-extrabold tracking-tight outline-none placeholder:text-muted-foreground/40"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {[100, 250, 500, 1000, 5000].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => {
                      setAmount((prev) =>
                        prev ? String(Number(prev) + quick) : String(quick)
                      );
                      clearFieldError("amount");
                    }}
                    className="rounded-full bg-card px-3.5 py-1.5 text-sm font-medium text-muted-foreground shadow-xs transition-colors hover:text-foreground"
                  >
                    Rs. +{quick}
                  </button>
                ))}
              </div>
            </div>
            {fieldErrors.amount ? (
              <p
                id="amount-error"
                role="alert"
                className="mt-2 px-1 text-xs font-medium text-destructive"
              >
                {fieldErrors.amount}
              </p>
            ) : null}
          </div>

          <div role="group" aria-labelledby="category-label">
            <p id="category-label" className="mb-2 text-sm font-medium">
              Category
            </p>
            <div className="grid grid-cols-4 gap-2">
              {activeCategories.map((meta) => {
                const Icon = meta.icon;
                const active = category === meta.name;
                return (
                  <button
                    key={meta.name}
                    type="button"
                    title={meta.name}
                    aria-pressed={active}
                    onClick={() => {
                      setCategory(meta.name);
                      clearFieldError("category");
                    }}
                    className={cn(
                      "flex min-w-0 w-full flex-col items-center justify-center gap-1.5 rounded-2xl p-2.5 text-center transition-all overflow-hidden border border-white/10 cursor-pointer",
                      active
                        ? "bg-accent/80 text-foreground shadow-sm border-white/25 ring-1 ring-primary/30"
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
            {fieldErrors.category ? (
              <p role="alert" className="mt-2 px-1 text-xs font-medium text-destructive">
                {fieldErrors.category}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="note" className="text-sm font-medium">
              Note
            </label>
            <Input
              id="note"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                clearFieldError("note");
              }}
              placeholder="e.g. Coffee with Sara"
              maxLength={500}
              aria-invalid={Boolean(fieldErrors.note)}
              aria-describedby={fieldErrors.note ? "note-error" : undefined}
            />
            {fieldErrors.note ? (
              <p
                id="note-error"
                role="alert"
                className="text-xs font-medium text-destructive"
              >
                {fieldErrors.note}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 min-w-0">
              <label htmlFor="transaction-date" className="text-sm font-medium">
                Date
              </label>
              <DatePicker
                id="transaction-date"
                value={date}
                onChange={(val) => {
                  setDate(val);
                  clearFieldError("date");
                }}
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {quickDates.map((q) => (
                  <button
                    key={q.value}
                    type="button"
                    onClick={() => {
                      setDate(q.value);
                      clearFieldError("date");
                    }}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors cursor-pointer",
                      date === q.value
                        ? "bg-primary/20 text-primary font-semibold"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
              {fieldErrors.date ? (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {fieldErrors.date}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5 min-w-0">
              <label htmlFor="transaction-space" className="text-sm font-medium">
                Space
              </label>
              <Select
                disabled={Boolean(formState.lockSpace)}
                value={activeSpaceId}
                onValueChange={(val) => {
                  if (!val || formState.lockSpace) return;
                  if (val === "__new__") {
                    // Open the nested sheet instead of closing the form.
                    setNewSpaceOpen(true);
                    return;
                  }
                  setSpace(val);
                  clearFieldError("space");
                }}
              >
                <SelectTrigger
                  id="transaction-space"
                  ref={spaceRef}
                  disabled={Boolean(formState.lockSpace)}
                  className="relative pl-10"
                  aria-invalid={Boolean(fieldErrors.space)}
                  aria-describedby={fieldErrors.space ? "space-error" : undefined}
                >
                  <Wallet className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <SelectValue placeholder="Select space">
                    {selectedSpaceName}
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
              {fieldErrors.space ? (
                <p
                  id="space-error"
                  role="alert"
                  className="text-xs font-medium text-destructive"
                >
                  {fieldErrors.space}
                </p>
              ) : null}
            </div>
          </div>

          <div role="group" aria-labelledby="payment-label">
            <p id="payment-label" className="text-sm font-medium">
              Payment
            </p>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((method) => {
                const Icon = PAYMENT_ICONS[method] ?? Wallet;
                return (
                  <button
                    key={method}
                    type="button"
                    aria-pressed={paymentMethod === method}
                    onClick={() => {
                      setPaymentMethod(method);
                      clearFieldError("paymentMethod");
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all",
                      paymentMethod === method
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                    {PAYMENT_LABELS[method]}
                  </button>
                );
              })}
            </div>
            {fieldErrors.paymentMethod ? (
              <p role="alert" className="mt-2 text-xs font-medium text-destructive">
                {fieldErrors.paymentMethod}
              </p>
            ) : null}
          </div>
        </div>
      </Sheet>

      {/* Nested: create a space without closing or resetting the form. */}
      <Sheet
        open={newSpaceOpen}
        onOpenChange={(open) => {
          setNewSpaceOpen(open);
          if (!open) {
            setNewSpaceError(null);
          }
        }}
        title="New space"
        description="Create it here; the transaction stays open and the new space is selected."
      >
        <div className="flex flex-col gap-4 pt-2">
          <div className="space-y-1.5">
            <label htmlFor="new-space-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="new-space-name"
              value={newSpaceName}
              onChange={(e) => {
                setNewSpaceName(e.target.value);
                setNewSpaceError(null);
              }}
              placeholder="e.g. Goa Trip"
              maxLength={100}
              autoFocus
              aria-invalid={Boolean(newSpaceError)}
              aria-describedby={newSpaceError ? "new-space-error" : undefined}
            />
            {newSpaceError ? (
              <p
                id="new-space-error"
                role="alert"
                className="text-xs font-medium text-destructive"
              >
                {newSpaceError}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Type</p>
            <Segmented
              options={SPACE_TYPE_OPTIONS}
              value={newSpaceType}
              onChange={setNewSpaceType}
            />
          </div>

          <Button
            size="lg"
            className="w-full text-base"
            onClick={handleCreateSpace}
            disabled={!newSpaceName.trim() || createSpaceMutation.isPending}
          >
            {createSpaceMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Plus className="size-4 mr-2" />
                Create and use this space
              </>
            )}
          </Button>
        </div>
      </Sheet>
    </>
  );
}

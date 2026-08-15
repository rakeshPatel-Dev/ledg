import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { DEFAULT_CURRENCY, type TransactionType, type Transaction } from "@ledg/shared";
import { motion, AnimatePresence } from "framer-motion";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SwipeableTransactionItem } from "@/components/transactions/swipeable-transaction-item";
import { DeleteTransactionSheet } from "@/components/transactions/delete-transaction-sheet";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { useAllData } from "@/lib/queries";
import { formatCurrency, relativeDay, localDateKey } from "@/lib/format";
import { useTransactionForm } from "@/lib/transaction-form";
import { cn } from "@/lib/utils";
import { FadeInStagger, FadeInItem } from "@/components/common/page-transition";

type TypeFilter = "all" | TransactionType;

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
];

function formatDayBalance(
  items: { type: TransactionType; amount: number }[]
) {
  const net = items.reduce((sum, t) => {
    if (t.type === "income") return sum + t.amount;
    if (t.type === "expense") return sum - t.amount;
    return sum;
  }, 0);
  if (net === 0) return "";
  return `${net > 0 ? "+" : "−"}${formatCurrency(Math.abs(net), DEFAULT_CURRENCY)}`;
}

export default function TransactionsPage() {
  const { spaces, transactions, loading } = useAllData();
  const { openCreate, openEdit } = useTransactionForm();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [spaceFilter, setSpaceFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return transactions
      .filter((t) => {
        if (typeFilter !== "all" && t.type !== typeFilter) return false;
        if (spaceFilter !== "all" && t.spaceId !== spaceFilter) return false;
        if (keyword) {
          const haystack = `${t.note} ${t.category} ${t.paymentMethod ?? ""}`.toLowerCase();
          if (!haystack.includes(keyword)) return false;
        }
        return true;
      })
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [transactions, search, typeFilter, spaceFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const t of filtered) {
      const key = localDateKey(t.date);
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <FadeInStagger className="flex flex-col gap-5">
      <FadeInItem>
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Activity
            </h1>
            <p className="text-sm text-muted-foreground">
              {filtered.length} transaction{filtered.length === 1 ? "" : "s"}
            </p>
          </div>
          <Button aria-label="Show Filters" variant="outline" size="icon" onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal className="size-4" />
          </Button>
        </header>
      </FadeInItem>

      <FadeInItem>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes, categories…"
            className="pl-10"
          />
        </label>
      </FadeInItem>

      <FadeInItem>
        <Segmented
          options={TYPE_FILTERS}
          value={typeFilter}
          onChange={setTypeFilter}
        />
      </FadeInItem>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setSpaceFilter("all")}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer",
                  spaceFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                )}
              >
                All spaces
              </button>
              {spaces.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSpaceFilter(s.id)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer",
                    spaceFilter === s.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-3xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <FadeInItem>
          <EmptyState
            title="No transactions found"
            description={
              search || typeFilter !== "all" || spaceFilter !== "all"
                ? "Try clearing filters or search to see more results."
                : "Tap below to log your first transaction."
            }
            action={
              <Button onClick={() => openCreate()}>Add transaction</Button>
            }
          />
        </FadeInItem>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(([day, items]) => (
            <FadeInItem key={day}>
              <section className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {relativeDay(day)}
                  </h3>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatDayBalance(items)}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((t) => (
                    <SwipeableTransactionItem
                      key={t.id}
                      transaction={t}
                      currency={DEFAULT_CURRENCY}
                      onClick={() => openEdit(t, t.spaceId)}
                      onRequestDelete={() => setDeleteTarget(t)}
                    />
                  ))}
                </div>
              </section>
            </FadeInItem>
          ))}
        </div>
      )}

      <DeleteTransactionSheet
        transaction={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      />
    </FadeInStagger>
  );
}

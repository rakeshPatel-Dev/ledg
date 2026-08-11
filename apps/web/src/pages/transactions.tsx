import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { DEFAULT_CURRENCY, type TransactionType } from "@ledg/shared";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { TransactionItem } from "@/components/transactions/transaction-item";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { useAllData } from "@/lib/queries";
import { formatCurrency, relativeDay } from "@/lib/format";
import { useTransactionForm } from "@/lib/transaction-form";
import { cn } from "@/lib/utils";

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
  const { openCreate } = useTransactionForm();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [spaceFilter, setSpaceFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

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
      const key = new Date(t.date).toISOString().slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="flex flex-col gap-5">
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

      <label className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes, categories…"
          className="pl-10"
        />
      </label>

      <Segmented
        options={TYPE_FILTERS}
        value={typeFilter}
        onChange={setTypeFilter}
      />

      {showFilters && spaces.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSpaceFilter("all")}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-all",
              spaceFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            All spaces
          </button>
          {spaces.map((space) => (
            <button
              key={space.id}
              type="button"
              onClick={() => setSpaceFilter(space.id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-all",
                spaceFilter === space.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {space.name}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-3xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No transactions found"
          description={
            search || typeFilter !== "all"
              ? "Try adjusting your search or filters."
              : "Add your first transaction to start tracking your spending."
          }
          action={
            !search && typeFilter === "all" ? (
              <Button onClick={() => openCreate()}>Add transaction</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map(([day, items]) => (
            <section key={day} className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {relativeDay(day)}
                </h3>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatDayBalance(items)}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((t) => (
                  <TransactionItem
                    key={t.id}
                    transaction={t}
                    currency={DEFAULT_CURRENCY}
                    onClick={() => undefined}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

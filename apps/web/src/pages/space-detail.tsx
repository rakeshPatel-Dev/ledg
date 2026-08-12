import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Search,
  Wallet,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import type { TransactionType } from "@ledg/shared";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { TransactionItem } from "@/components/transactions/transaction-item";
import {
  useSpaces,
  useAllData,
  useUpdateSpace,
  useDeleteSpace,
} from "@/lib/queries";
import { formatCurrency, relativeDay, localDateKey } from "@/lib/format";
import { useTransactionForm } from "@/lib/transaction-form";
import { FadeInStagger, FadeInItem } from "@/components/common/page-transition";
import {
  SPACE_TYPE_ICONS,
  SPACE_TYPE_BG,
  SPACE_TYPE_TEXT,
  SPACE_TYPE_BADGE,
  getBalanceColor,
} from "@/lib/space-colors";
import { SPACE_TYPES, type SpaceType } from "@ledg/shared";

type TypeFilter = "all" | TransactionType;

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
];

const TYPE_OPTIONS = SPACE_TYPES.map((t) => ({
  value: t,
  label: t.charAt(0).toUpperCase() + t.slice(1),
}));

export default function SpaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: spaces, isLoading: loadingSpaces } = useSpaces();
  const { transactions, loading: loadingTransactions } = useAllData();
  const { openCreate, openEdit: openTransactionEdit } = useTransactionForm();

  const updateSpace = useUpdateSpace();
  const deleteSpace = useDeleteSpace();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<SpaceType>("personal");

  const space = useMemo(
    () => spaces?.find((s) => s.id === id),
    [spaces, id]
  );

  const spaceTransactions = useMemo(() => {
    if (!id) return [];
    return transactions.filter((t) => t.spaceId === id);
  }, [transactions, id]);

  const filteredTransactions = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return spaceTransactions
      .filter((t) => {
        if (typeFilter !== "all" && t.type !== typeFilter) return false;
        if (keyword) {
          const haystack = `${t.note} ${t.category} ${t.paymentMethod ?? ""}`.toLowerCase();
          if (!haystack.includes(keyword)) return false;
        }
        return true;
      })
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [spaceTransactions, search, typeFilter]);

  const analytics = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of spaceTransactions) {
      if (t.type === "income") income += t.amount;
      if (t.type === "expense") expense += t.amount;
    }
    return {
      income,
      expense,
      balance: income - expense,
      count: spaceTransactions.length,
    };
  }, [spaceTransactions]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof filteredTransactions>();
    for (const t of filteredTransactions) {
      const key = localDateKey(t.date);
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [filteredTransactions]);

  const openEditSpaceModal = () => {
    if (!space) return;
    setEditName(space.name);
    setEditType(space.type);
    setSheetOpen(true);
  };

  const handleUpdateSpace = async () => {
    if (!space) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      toast.error("Space name is required");
      return;
    }
    try {
      await updateSpace.mutateAsync({
        id: space.id,
        data: { name: trimmed, type: editType },
      });
      toast.success("Space updated");
      setSheetOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update space");
    }
  };

  const handleDeleteSpace = async () => {
    if (!space) return;
    try {
      await deleteSpace.mutateAsync(space.id);
      toast.success(`Deleted "${space.name}"`);
      navigate("/spaces", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete space");
    }
  };

  const isLoading = loadingSpaces || loadingTransactions;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-32 rounded-full" />
        <Skeleton className="h-44 w-full rounded-4xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-3xl" />
      </div>
    );
  }

  if (!space) {
    return (
      <EmptyState
        icon={<Wallet className="size-8" />}
        title="Space not found"
        description="The space you are looking for does not exist or has been deleted."
        action={
          <Button onClick={() => navigate("/spaces")} className="rounded-full">
            Back to Spaces
          </Button>
        }
      />
    );
  }

  const Icon = SPACE_TYPE_ICONS[space.type] ?? Wallet;
  const typeBg = SPACE_TYPE_BG[space.type];
  const typeText = SPACE_TYPE_TEXT[space.type];
  const typeBadge = SPACE_TYPE_BADGE[space.type];
  const balanceColor = getBalanceColor(analytics.balance);

  return (
    <FadeInStagger className="flex flex-col gap-5">
      {/* Top Header */}
      <FadeInItem>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/spaces")}
            className="group flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            Back to Spaces
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={openEditSpaceModal}
              aria-label="Edit space"
              className="rounded-full"
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDeleting(true)}
              aria-label="Delete space"
              className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </FadeInItem>

      {/* Search & Filter */}
      <FadeInItem className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${space.name} transactions…`}
            className="pl-10"
          />
        </div>
      </FadeInItem>

      {/* Main Space Hero Banner */}
      <FadeInItem>
        <Card className="flex flex-col gap-4 rounded-4xl p-5 relative overflow-hidden border border-border/50 bg-card/80 backdrop-blur-md shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span
                  className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${typeBg} ${typeText}`}
                >
                  <Icon className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h1 className="text-lg font-extrabold tracking-tight text-foreground truncate">
                      {space.name}
                    </h1>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${typeBadge} shrink-0`}
                    >
                      {space.type}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {analytics.count} transaction{analytics.count !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <Button
                size="lg"
                onClick={() => {
                  openCreate(space.id);
                }}
                className="rounded-full h-12 w-12 shrink-0 shadow-sm"
              >
                <Plus className="size-6" />
              </Button>
            </div>

            {/* Balance & Analytics breakdown - Mobile Grid */}
            <div className="flex flex-col gap-2 rounded-2xl bg-muted/40 p-3 border border-border/40">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Balance
                </p>
                <p className={`text-base font-black tabular-nums mt-0.5 ${balanceColor}`}>
                  {formatCurrency(analytics.balance)}
                </p>
              </div>

              <div className="my-0.5 h-px bg-border/40" />

              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-0.5">
                  <TrendingUp className="size-3 text-emerald-500" /> Income
                </p>
                <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                  +{formatCurrency(analytics.income)}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-0.5">
                  <TrendingDown className="size-3 text-rose-500" /> Expenses
                </p>
                <p className="text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400 mt-0.5">
                  -{formatCurrency(analytics.expense)}
                </p>
              </div>
            </div>
          </Card>
      </FadeInItem>

      <FadeInItem className="">
  
      <Segmented
          options={TYPE_FILTERS}
          value={typeFilter}
          onChange={setTypeFilter}
          />
          </FadeInItem>

      

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <FadeInItem>
          <EmptyState
            title="No transactions in this space"
            description={
              search || typeFilter !== "all"
                ? "Try clearing filters to see transactions."
                : `Tap below to add the first transaction to ${space.name}.`
            }
            action={
              <Button onClick={() => openCreate(space.id)} className="rounded-full">
                Add transaction
              </Button>
            }
          />
        </FadeInItem>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map(([day, items]) => (
            <FadeInItem key={day}>
              <section className="flex flex-col gap-2">
                <h3 className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {relativeDay(day)}
                </h3>
                <div className="flex flex-col gap-2">
                  {items.map((t) => (
                    <TransactionItem
                      key={t.id}
                      transaction={t}
                      onClick={() => openTransactionEdit(t, space.id)}
                    />
                  ))}
                </div>
              </section>
            </FadeInItem>
          ))}
        </div>
      )}

      {/* Edit Space Sheet */}
      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Edit Space"
        description="Update the space name or type."
      >
        <div className="flex flex-col gap-5 pt-2">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Name
            </p>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Type
            </p>
            <Segmented
              options={TYPE_OPTIONS}
              value={editType}
              onChange={setEditType}
            />
          </div>

          <Button
            size="lg"
            className="mt-2 w-full rounded-full text-base font-semibold"
            onClick={handleUpdateSpace}
            disabled={updateSpace.isPending}
          >
            Save changes
          </Button>
        </div>
      </Sheet>

      {/* Delete Space Sheet */}
      <Sheet
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete Space"
        description={`Are you sure you want to delete "${space.name}"?`}
      >
        <div className="flex flex-col gap-3 pt-3">
          <Button
            variant="destructive-solid"
            size="lg"
            className="w-full rounded-full text-base font-semibold"
            onClick={handleDeleteSpace}
            disabled={deleteSpace.isPending}
          >
            Delete Space
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full rounded-full text-base font-semibold"
            onClick={() => setDeleting(false)}
          >
            Cancel
          </Button>
        </div>
      </Sheet>
    </FadeInStagger>
  );
}

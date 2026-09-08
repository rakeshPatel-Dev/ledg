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
  Download,
  Loader2,
  PieChart,
  Check,
  X,
  ReceiptText,
  SearchX,
  Users,
  ShieldCheck,
  UserMinus,
  Mail,
  RotateCw,
  LogOut,
  MoreVertical,
} from "lucide-react";
import type { Transaction, TransactionType } from "@ledg/shared";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { SwipeableTransactionItem } from "@/components/transactions/swipeable-transaction-item";
import { DeleteTransactionSheet } from "@/components/transactions/delete-transaction-sheet";
import {
  useSpaces,
  useAllData,
  useUpdateSpace,
  useDeleteSpace,
  useSpaceMembers,
  useSpaceInvitations,
  useInviteMember,
  useRemoveMember,
  useTransferOwnership,
  useLeaveSpace,
  useResendInvitation,
  useCancelInvitation,
} from "@/lib/queries";
import { formatCurrency, relativeDay, localDateKey, monthKey } from "@/lib/format";
import { exportTransactionsToCSV } from "@/lib/export";
import { useTransactionForm } from "@/lib/transaction-form";
import { useAuth } from "@/lib/auth-provider";
import { cn } from "@/lib/utils";
import { FadeInStagger, FadeInItem } from "@/components/common/page-transition";
import {
  SPACE_TYPE_ICONS,
  SPACE_TYPE_BG,
  SPACE_TYPE_TEXT,
  SPACE_TYPE_BADGE,
  getBalanceColor,
} from "@/lib/space-colors";
import { SPACE_TYPES, spaceSchema, type SpaceType } from "@ledg/shared";

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

const PAGE_SIZE = 20;

export default function SpaceDetailPage() {

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: spaces, isLoading: loadingSpaces } = useSpaces();
  const { transactions, loading: loadingTransactions } = useAllData();
  const { openCreate, openEdit: openTransactionEdit } = useTransactionForm();

  const updateSpace = useUpdateSpace();
  const deleteSpace = useDeleteSpace();

  // Member management mutations & queries
  const { data: spaceMembers, isLoading: loadingMembers } = useSpaceMembers(id);
  const { data: spaceInvitations } = useSpaceInvitations(id);
  const inviteMemberMutation = useInviteMember();
  const removeMemberMutation = useRemoveMember();
  const transferOwnershipMutation = useTransferOwnership();
  const leaveSpaceMutation = useLeaveSpace();
  const resendInviteMutation = useResendInvitation();
  const cancelInviteMutation = useCancelInvitation();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [membersSheetOpen, setMembersSheetOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<SpaceType>("personal");
  const [editMonthlyBudget, setEditMonthlyBudget] = useState("");

  // Member management state
  const [newInviteIdentifier, setNewInviteIdentifier] = useState("");
  const [transferTarget, setTransferTarget] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [removingTarget, setRemovingTarget] = useState<{
    userId: string;
    name: string;
  } | null>(null);

  const space = useMemo(
    () => spaces?.find((s) => s.id === id),
    [spaces, id]
  );

  const isOwner = useMemo(() => {
    if (!space) return false;
    return space.role === "owner" || (!space.role && space.ownerId === user?.id);
  }, [space, user]);

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

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedTransactions = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredTransactions.slice(start, start + PAGE_SIZE);
  }, [filteredTransactions, safePage]);

  const analytics = useMemo(() => {
    let income = 0;
    let expense = 0;
    let monthExpense = 0;
    const currentMonth = monthKey(new Date());

    for (const t of spaceTransactions) {
      if (t.type === "income") income += t.amount;
      if (t.type === "expense") {
        expense += t.amount;
        if (monthKey(t.date) === currentMonth) {
          monthExpense += t.amount;
        }
      }
    }
    return {
      income,
      expense,
      monthExpense,
      balance: income - expense,
      count: spaceTransactions.length,
    };
  }, [spaceTransactions]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof paginatedTransactions>();
    for (const t of paginatedTransactions) {
      const key = localDateKey(t.date);
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [paginatedTransactions]);

  const openEditSpaceModal = () => {
    if (!space) return;
    setEditName(space.name);
    setEditType(space.type);
    setEditMonthlyBudget(
      space.monthlyBudget != null ? String(space.monthlyBudget) : ""
    );
    setSheetOpen(true);
  };

  const handleUpdateSpace = async () => {
    if (!space) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      toast.error("Space name is required");
      return;
    }

    const parsedBudget = editMonthlyBudget.trim() ? Number(editMonthlyBudget) : null;
    if (parsedBudget !== null && (isNaN(parsedBudget) || parsedBudget < 0)) {
      toast.error("Budget must be a positive number");
      return;
    }

    const parsed = spaceSchema.safeParse({
      name: trimmed,
      type: editType,
      monthlyBudget: parsedBudget,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path = issue.path.join(".");
      const label = path === "name" ? "Space name" : path;
      toast.error(label ? `${label}: ${issue.message}` : issue.message);
      return;
    }

    try {
      await updateSpace.mutateAsync({
        id: space.id,
        data: parsed.data,
      });
      toast.success("Space updated");
      setSheetOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update space");
    }
  };

  const handleExportCSV = () => {
    if (!space) return;
    exportTransactionsToCSV(
      spaceTransactions,
      spaces ?? [],
      `${space.name.toLowerCase().replace(/\s+/g, "-")}-transactions.csv`
    );
    toast.success(`Exported ${spaceTransactions.length} transactions`);
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

  // Member Management Handlers
  const handleInviteMember = async () => {
    if (!id || !newInviteIdentifier.trim()) return;
    const raw = newInviteIdentifier.trim();

    const isUsername = raw.startsWith("@") || !raw.includes("@");
    let identifierToSend = "";

    if (isUsername) {
      const clean = (raw.startsWith("@") ? raw.slice(1) : raw).toLowerCase();
      if (!/^[a-z0-9_]{3,30}$/.test(clean)) {
        toast.error("Usernames must be 3-30 letters, numbers, or underscores");
        return;
      }
      if (user?.username && clean === user.username.toLowerCase()) {
        toast.error("You cannot invite yourself");
        return;
      }
      identifierToSend = `@${clean}`;
    } else {
      const normalizedEmail = raw.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        toast.error("Please enter a valid email address or @username");
        return;
      }
      if (user?.email && normalizedEmail === user.email.toLowerCase()) {
        toast.error("You are already the owner of this space");
        return;
      }
      identifierToSend = normalizedEmail;
    }

    try {
      await inviteMemberMutation.mutateAsync({ spaceId: id, identifier: identifierToSend });
      toast.success(`Invitation sent to ${identifierToSend}`);
      setNewInviteIdentifier("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send invitation");
    }
  };


  const handleResendInvite = async (invitationId: string, invitee: string) => {
    try {
      await resendInviteMutation.mutateAsync(invitationId);
      toast.success(`Resent invitation to ${invitee}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to resend invitation");
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    try {
      await cancelInviteMutation.mutateAsync(invitationId);
      toast.info("Invitation revoked");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke invitation");
    }
  };

  const handleRemoveMemberConfirm = async () => {
    if (!id || !removingTarget) return;
    try {
      await removeMemberMutation.mutateAsync({
        spaceId: id,
        userId: removingTarget.userId,
      });
      toast.success(`Removed ${removingTarget.name} from space`);
      setRemovingTarget(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  const handleTransferOwnershipConfirm = async () => {
    if (!id || !transferTarget) return;
    try {
      await transferOwnershipMutation.mutateAsync({
        spaceId: id,
        userId: transferTarget.userId,
      });
      toast.success(`Transferred ownership to ${transferTarget.name}`);
      setTransferTarget(null);
      setMembersSheetOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to transfer ownership");
    }
  };

  const handleLeaveSpaceConfirm = async () => {
    if (!id) return;
    try {
      await leaveSpaceMutation.mutateAsync(id);
      toast.success(`Left "${space?.name || "space"}"`);
      setLeaving(false);
      navigate("/spaces", { replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to leave space");
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
            <ArrowLeft className="size-4 mr-2" />
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
  const members = spaceMembers || space.members || [];

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
            Back
          </button>

          <div className="flex items-center gap-2">
            {/* Members Management Trigger */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMembersSheetOpen(true)}
              aria-label="Manage members"
              className="rounded-full gap-1.5 px-3 text-xs font-semibold"
            >
              <Users className="size-3.5 text-primary" />
              <span>Members</span>
              {members.length > 0 && (
                <span className="ml-0.5 rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                  {members.length}
                </span>
              )}
            </Button>

            {isOwner && (
              <Button
                variant="outline"
                size="icon"
                onClick={openEditSpaceModal}
                aria-label="Edit space"
                className="rounded-full"
              >
                <Pencil className="size-4" />
              </Button>
            )}

            {/* Three-dot More Options Menu */}
            <Popover>
              <PopoverTrigger className="w-auto">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="More space actions"
                  className="rounded-full"
                >
                  <MoreVertical className="size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" side="bottom" className="w-44 p-1.5 flex flex-col gap-0.5 rounded-2xl shadow-xl">

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <Download className="size-3.5 text-muted-foreground" />
                  <span>Export CSV</span>
                </button>
                {isOwner ? (
                  <button
                    type="button"
                    onClick={() => setDeleting(true)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Delete Space</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setLeaving(true)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  >
                    <LogOut className="size-3.5" />
                    <span>Leave Space</span>
                  </button>
                )}
              </PopoverContent>
            </Popover>
          </div>

        </div>
      </FadeInItem>

      {/* Search & Filter */}
      <FadeInItem className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
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
                openCreate(space.id, true);
              }}
              className="rounded-full h-12 w-12 shrink-0 shadow-sm"
            >
              <Plus className="size-6" />
            </Button>
          </div>

          {/* Balance & Analytics breakdown */}
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

            {space.monthlyBudget && space.monthlyBudget > 0 ? (() => {
              const spent = analytics.monthExpense;
              const budget = space.monthlyBudget;
              const isOver = spent > budget;
              const percent = Math.round((spent / budget) * 100);
              const overAmount = spent - budget;
              const budgetWidth = isOver ? (budget / spent) * 100 : Math.min(100, percent);
              const overWidth = isOver ? (overAmount / spent) * 100 : 0;

              return (
                <>
                  <div className="my-0.5 h-px bg-border/40" />
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <PieChart className="size-3 text-primary" /> Month Budget
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("font-bold tabular-nums", isOver ? "text-destructive" : "text-foreground")}>
                          {formatCurrency(spent)}
                        </span>
                        <span className="text-muted-foreground text-[11px]">/ {formatCurrency(budget)}</span>
                      </div>
                    </div>

                    {isOver ? (
                      <div className="h-2.5 w-full flex overflow-hidden rounded-full bg-muted/60 gap-0.5 p-0.5">
                        <div
                          className="h-full rounded-l-full bg-primary/70 transition-all duration-500"
                          style={{ width: `${budgetWidth}%` }}
                          title={`Budget: ${formatCurrency(budget)}`}
                        />
                        <div
                          className="h-full rounded-r-full bg-destructive transition-all duration-500"
                          style={{ width: `${overWidth}%` }}
                          title={`Over by: ${formatCurrency(overAmount)}`}
                        />
                      </div>
                    ) : (
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/80">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            percent >= 75 ? "bg-amber-500" : "bg-primary"
                          )}
                          style={{ width: `${budgetWidth}%` }}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px]">
                      {isOver ? (
                        <>
                          <span className="text-muted-foreground">Budget: {formatCurrency(budget)}</span>
                          <span className="font-semibold text-destructive">
                            +{formatCurrency(overAmount)} over budget ({percent}%)
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-muted-foreground">{percent}% spent</span>
                          <span className="text-muted-foreground font-medium">
                            {formatCurrency(budget - spent)} remaining
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </>
              );
            })() : null}
          </div>
        </Card>
      </FadeInItem>

      <FadeInItem>
        <Segmented
          options={TYPE_FILTERS}
          value={typeFilter}
          onChange={(val) => {
            setTypeFilter(val);
            setCurrentPage(1);
          }}
        />
      </FadeInItem>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <FadeInItem>
          <Card className="rounded-4xl p-2 border border-border/60">
            <EmptyState
              icon={
                search || typeFilter !== "all" ? (
                  <SearchX className="size-7" />
                ) : (
                  <ReceiptText className="size-7" />
                )
              }
              title={
                search || typeFilter !== "all"
                  ? "No matching transactions"
                  : "No transactions in this space"
              }
              description={
                search || typeFilter !== "all"
                  ? "Try clearing your search or category filter to see transactions."
                  : `Tap below to add the first transaction to ${space.name}.`
              }
              action={
                search || typeFilter !== "all" ? (
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      setSearch("");
                      setTypeFilter("all");
                    }}
                  >
                    <X className="size-4 mr-2" />
                    Clear filters
                  </Button>
                ) : (
                  <Button onClick={() => openCreate(space.id, true)} className="rounded-full">
                    <Plus className="size-4 mr-2" />
                    Add transaction
                  </Button>
                )
              }
            />
          </Card>
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
                  {items.map((t) => {
                    const isCreator = Boolean(
                      t.createdBy?.userId &&
                        user?.id &&
                        t.createdBy.userId === user.id
                    );
                    const canEdit = isOwner || isCreator;
                    const canDelete = isOwner || isCreator;
                    return (
                      <SwipeableTransactionItem
                        key={t.id}
                        transaction={t}
                        canDelete={canDelete}
                        onClick={() => {
                          if (canEdit) {
                            openTransactionEdit(t, space.id, true);
                          } else {
                            toast.info("Only the creator or space owner can edit this transaction");
                          }
                        }}
                        onRequestDelete={() => {
                          if (canDelete) {
                            setDeleteTarget(t);
                          }
                        }}
                      />
                    );
                  })}
                </div>
              </section>
            </FadeInItem>
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <FadeInItem>
              <div className="flex flex-col items-center gap-2 pt-2">
                <p className="text-xs text-muted-foreground">
                  Page {safePage} of {totalPages} ({filteredTransactions.length} total)
                </p>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={safePage <= 1}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                      if (
                        p === 1 ||
                        p === totalPages ||
                        (p >= safePage - 1 && p <= safePage + 1)
                      ) {
                        return (
                          <PaginationItem key={p}>
                            <PaginationLink
                              isActive={p === safePage}
                              onClick={() => setCurrentPage(p)}
                            >
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      return null;
                    })}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage >= totalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </FadeInItem>
          )}
        </div>
      )}

      {/* Member Management Sheet */}
      <Sheet
        open={membersSheetOpen}
        onOpenChange={setMembersSheetOpen}
        title="Space Members"
        description={`Collaborators in "${space.name}"`}
      >
        <div className="flex flex-col gap-5 pt-2">
          {/* Active Members List */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Members ({members.length})
            </p>

            <div className="flex flex-col gap-2">
              {loadingMembers ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin inline mr-2" />
                  Loading members...
                </div>
              ) : (
                members.map((m) => {
                  const isCurrent = m.userId === user?.id;
                  const isMemberOwner = m.role === "owner";
                  const initials = (m.name || "U")
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  return (
                    <div
                      key={m.userId}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 p-3 border border-border/40"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {m.name}
                            </p>
                            {isCurrent && (
                              <span className="text-[10px] text-muted-foreground font-medium">
                                (You)
                              </span>
                            )}
                          </div>
                          {m.username && (
                            <p className="text-xs text-muted-foreground truncate">
                              @{m.username}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isMemberOwner ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                            <ShieldCheck className="size-3" />
                            Owner
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                            Member
                          </span>
                        )}

                        {/* Owner Actions for Non-Owner Members */}
                        {isOwner && !isMemberOwner && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Transfer Ownership"
                              onClick={() =>
                                setTransferTarget({
                                  userId: m.userId,
                                  name: m.name,
                                })
                              }
                              className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                            >
                              Transfer
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Remove Member"
                              onClick={() =>
                                setRemovingTarget({
                                  userId: m.userId,
                                  name: m.name,
                                })
                              }
                              className="size-7 text-destructive hover:bg-destructive/10"
                            >
                              <UserMinus className="size-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Owner Only: Invite Member Input */}
          {isOwner && (
            <div className="space-y-2 border-t border-border/50 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Invite New Member
              </p>
              <div className="flex items-center flex-col gap-2">
                <Input
                  type="text"
                  value={newInviteIdentifier}
                  onChange={(e) => setNewInviteIdentifier(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleInviteMember();
                    }
                  }}
                  placeholder="member@email.com or @username"
                  className=""
                />

                <Button
                  onClick={handleInviteMember}
                  disabled={
                    !newInviteIdentifier.trim() || inviteMemberMutation.isPending
                  }
                  className="rounded-full w-full shrink-0"
                >
                  {inviteMemberMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Mail className="size-4 mr-1.5" />
                      Invite
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Owner Only: Pending Invitations List */}
          {isOwner && spaceInvitations && spaceInvitations.length > 0 && (
            <div className="space-y-2 border-t border-border/50 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pending Invitations ({spaceInvitations.length})
              </p>
              <div className="flex flex-col gap-2">
                {spaceInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-2 rounded-2xl bg-muted/30 p-2.5 border border-border/30"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {inv.inviteeUsername ? `@${inv.inviteeUsername}` : inv.inviteeEmail}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Sent on {new Date(inv.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendInvite(inv.id, inv.inviteeUsername ? `@${inv.inviteeUsername}` : inv.inviteeEmail)}
                        disabled={resendInviteMutation.isPending}
                        className="h-7 px-2 text-[11px] rounded-full"
                      >
                        <RotateCw className="size-3 mr-1" />
                        Resend
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCancelInvite(inv.id)}
                        disabled={cancelInviteMutation.isPending}
                        className="size-7 rounded-full text-destructive hover:bg-destructive/10"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Member Only: Leave Space Button */}
          {!isOwner && (
            <div className="border-t border-border/50 pt-4">
              <Button
                variant="destructive"
                className="w-full rounded-full gap-2 font-semibold"
                onClick={() => setLeaving(true)}
              >
                <LogOut className="size-4" />
                Leave This Space
              </Button>
            </div>
          )}
        </div>
      </Sheet>

      {/* Transfer Ownership Confirmation Sheet */}
      <Sheet
        open={!!transferTarget}
        onOpenChange={(open) => !open && setTransferTarget(null)}
        title="Transfer Ownership"
        description={
          transferTarget
            ? `Transfer ownership of "${space.name}" to ${transferTarget.name}? You will become a regular member of this space.`
            : undefined
        }
      >
        <div className="flex flex-col gap-3 pt-3">
          <Button
            size="lg"
            className="w-full rounded-full text-base font-semibold"
            onClick={handleTransferOwnershipConfirm}
            disabled={transferOwnershipMutation.isPending}
          >
            {transferOwnershipMutation.isPending ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Check className="size-4 mr-2" />
            )}
            Confirm Transfer
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full rounded-full text-base font-semibold"
            onClick={() => setTransferTarget(null)}
          >
            <X className="size-4 mr-2" />
            Cancel
          </Button>
        </div>
      </Sheet>

      {/* Remove Member Confirmation Sheet */}
      <Sheet
        open={!!removingTarget}
        onOpenChange={(open) => !open && setRemovingTarget(null)}
        title="Remove Member"
        description={
          removingTarget
            ? `Are you sure you want to remove ${removingTarget.name} from "${space.name}"? Their past transactions will remain in this space.`
            : undefined
        }
      >
        <div className="flex flex-col gap-3 pt-3">
          <Button
            variant="destructive-solid"
            size="lg"
            className="w-full rounded-full text-base font-semibold"
            onClick={handleRemoveMemberConfirm}
            disabled={removeMemberMutation.isPending}
          >
            {removeMemberMutation.isPending ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="size-4 mr-2" />
            )}
            Remove Member
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full rounded-full text-base font-semibold"
            onClick={() => setRemovingTarget(null)}
          >
            <X className="size-4 mr-2" />
            Cancel
          </Button>
        </div>
      </Sheet>

      {/* Leave Space Confirmation Sheet */}
      <Sheet
        open={leaving}
        onOpenChange={setLeaving}
        title="Leave Space"
        description={`Are you sure you want to leave "${space.name}"? You will lose access to its transactions until re-invited.`}
      >
        <div className="flex flex-col gap-3 pt-3">
          <Button
            variant="destructive-solid"
            size="lg"
            className="w-full rounded-full text-base font-semibold"
            onClick={handleLeaveSpaceConfirm}
            disabled={leaveSpaceMutation.isPending}
          >
            {leaveSpaceMutation.isPending ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <LogOut className="size-4 mr-2" />
            )}
            Leave Space
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full rounded-full text-base font-semibold"
            onClick={() => setLeaving(false)}
          >
            <X className="size-4 mr-2" />
            Cancel
          </Button>
        </div>
      </Sheet>

      {/* Edit Space Sheet */}
      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Edit Space"
        description="Update the space name, type, or budget."
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

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Monthly Budget (Optional)
              </p>
              <span className="text-xs text-muted-foreground">Rs. / month</span>
            </div>
            <Input
              type="number"
              min="0"
              step="100"
              value={editMonthlyBudget}
              onChange={(e) => setEditMonthlyBudget(e.target.value)}
              placeholder="e.g. 25000"
            />
          </div>

          <Button
            size="lg"
            className="mt-2 w-full rounded-full text-base font-semibold"
            onClick={handleUpdateSpace}
            disabled={updateSpace.isPending}
          >
            {updateSpace.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Saving…
              </>
            ) : (
              <>
                <Check className="size-4 mr-2" />
                Save changes
              </>
            )}
          </Button>
        </div>
      </Sheet>

      {/* Delete Space Sheet */}
      <Sheet
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete Space"
        description={`This will permanently delete "${space.name}" and all ${analytics.count} transaction${analytics.count === 1 ? "" : "s"} in it.`}
      >
        <div className="flex flex-col gap-3 pt-3">
          <Button
            variant="destructive-solid"
            size="lg"
            className="w-full rounded-full text-base font-semibold"
            onClick={handleDeleteSpace}
            disabled={deleteSpace.isPending}
          >
            {deleteSpace.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="size-4 mr-2" />
                Delete Space
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full rounded-full text-base font-semibold"
            onClick={() => setDeleting(false)}
          >
            <X className="size-4 mr-2" />
            Cancel
          </Button>
        </div>
      </Sheet>

      {/* Delete Transaction Sheet */}
      <DeleteTransactionSheet
        transaction={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      />
    </FadeInStagger>
  );
}

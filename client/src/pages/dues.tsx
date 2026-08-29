import { useState, useMemo } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  HandCoins,
  LayoutList,
  Loader2,
  Phone,
  Search,
  Users,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Debt, DebtDirection, DebtStatus } from "@ledg/shared";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useDues, useDuesSummary } from "@/lib/queries";
import { formatCurrency, formatRelativeCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FadeInStagger, FadeInItem } from "@/components/common/page-transition";
import { CreateDueSheet } from "@/components/dues/create-due-sheet";
import { SettleDueSheet } from "@/components/dues/settle-due-sheet";
import { DueDetailSheet } from "@/components/dues/due-detail-sheet";

type FilterTab = "all" | "lent" | "borrowed" | "settled";

const TABS: { value: FilterTab; label: string; icon?: string }[] = [
  { value: "all", label: "Active", icon: "⚡" },
  { value: "lent", label: "Owed", icon: "↑" },
  { value: "borrowed", label: "I Owe", icon: "↓" },
  { value: "settled", label: "Done", icon: "✓" },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-amber-600",
    "from-rose-500 to-pink-600",
    "from-indigo-500 to-blue-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function DuesPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDirection, setCreateDirection] = useState<DebtDirection>("lent");
  const [selectedPerson, setSelectedPerson] = useState<string>("");

  const [settleOpen, setSettleOpen] = useState(false);
  const [selectedDueForSettle, setSelectedDueForSettle] = useState<Debt | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDueId, setSelectedDueId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"person" | "list">("person");
  const [expandedPeople, setExpandedPeople] = useState<Record<string, boolean>>({});

  const { data: duesSummary, isLoading: summaryLoading } = useDuesSummary();

  const queryParams = useMemo(() => {
    if (activeTab === "settled") return { status: "settled" as DebtStatus, pageSize: 50 };
    if (activeTab === "lent") return { direction: "lent" as DebtDirection, status: "all" as const, pageSize: 50 };
    if (activeTab === "borrowed") return { direction: "borrowed" as DebtDirection, status: "all" as const, pageSize: 50 };
    return { pageSize: 50 };
  }, [activeTab]);

  const { data: duesResult, isLoading: duesLoading } = useDues(queryParams);

  const filteredDues = useMemo(() => {
    let list = duesResult?.items ?? [];
    if (activeTab === "lent") list = list.filter((d) => d.direction === "lent" && d.status !== "settled");
    else if (activeTab === "borrowed") list = list.filter((d) => d.direction === "borrowed" && d.status !== "settled");
    else if (activeTab === "all") list = list.filter((d) => d.status !== "settled");

    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter(
      (d) =>
        d.counterparty.name.toLowerCase().includes(q) ||
        (d.note && d.note.toLowerCase().includes(q)) ||
        (d.counterparty.phone && d.counterparty.phone.includes(q))
    );
  }, [duesResult?.items, activeTab, search]);

  const groupedByPerson = useMemo(() => {
    const map = new Map<string, { name: string; phone?: string; dues: Debt[]; totalLent: number; totalBorrowed: number; net: number }>();
    for (const due of filteredDues) {
      const key = due.counterparty.name.toLowerCase().trim();
      let group = map.get(key);
      if (!group) {
        group = { name: due.counterparty.name, phone: due.counterparty.phone ?? undefined, dues: [], totalLent: 0, totalBorrowed: 0, net: 0 };
        map.set(key, group);
      }
      group.dues.push(due);
      const remaining = Math.max(0, due.principal - (due.settledAmount ?? 0));
      if (due.direction === "lent") group.totalLent += remaining;
      else group.totalBorrowed += remaining;
      group.net = group.totalLent - group.totalBorrowed;
    }
    return Array.from(map.values()).sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [filteredDues]);

  const togglePersonExpand = (name: string) => {
    setExpandedPeople((prev) => ({ ...prev, [name.toLowerCase()]: !prev[name.toLowerCase()] }));
  };

  const handleOpenCreate = (dir: DebtDirection = "lent", person = "") => {
    setCreateDirection(dir);
    setSelectedPerson(person);
    setCreateOpen(true);
  };

  const handleOpenSettle = (due: Debt) => {
    setSelectedDueForSettle(due);
    setSettleOpen(true);
  };

  const handleOpenDetail = (due: Debt) => {
    setSelectedDueId(due.id);
    setDetailOpen(true);
  };

  const isLoading = summaryLoading || duesLoading;
  const overdueCount = duesSummary?.overdueCount ?? 0;

  return (
    <FadeInStagger className="flex flex-col min-h-screen pb-28">
      {/* ── Hero ── */}
      <FadeInItem>
        <section className="-mx-5 bg-linear-to-br from-primary via-primary to-[oklch(0.52_0.15_158)] px-5 pb-7 pt-4 text-primary-foreground shadow-xl shadow-primary/25 rounded-b-[2.5rem]">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-4xl bg-primary-foreground/15 backdrop-blur-sm">
                <HandCoins className="size-4" />
              </div>
              <span className="text-sm font-bold tracking-wide">Dues & Loans</span>
            </div>
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className="flex size-8 items-center justify-center rounded-4xl bg-primary-foreground/15 backdrop-blur-sm transition-all active:scale-95"
            >
              {searchOpen ? <X className="size-4" /> : <Search className="size-4" />}
            </button>
          </div>

          {/* Search bar slide-down */}
          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-4 overflow-hidden"
              >
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-primary-foreground/50" />
                  <input
                    autoFocus
                    placeholder="Search by name, note, or phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-4xl bg-primary-foreground/15 backdrop-blur-sm pl-10 pr-4 py-2.5 text-sm text-primary-foreground placeholder:text-primary-foreground/50 outline-none border border-primary-foreground/20 focus:border-primary-foreground/40"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Net amount */}
          {summaryLoading ? (
            <div className="space-y-2 mb-5">
              <div className="h-9 w-36 animate-pulse rounded-3xl bg-primary-foreground/20" />
              <div className="h-3 w-24 animate-pulse rounded-full bg-primary-foreground/15" />
            </div>
          ) : (
            <div className="mb-5">
              <p className="text-4xl font-black tracking-tight tabular-nums leading-none">
                {formatCurrency(duesSummary?.net ?? 0)}
              </p>
              <p className="mt-1.5 text-xs font-medium text-primary-foreground/70">
                {(duesSummary?.net ?? 0) >= 0 ? "Net receivable" : "Net payable"}
                {duesSummary?.activeCount ? ` · ${duesSummary.activeCount} active` : ""}
              </p>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-3xl bg-primary-foreground/12 p-3.5 backdrop-blur-md">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-emerald-400/25">
                  <ArrowUpRight className="size-3 text-emerald-300" />
                </span>
                <span className="text-[0.68rem] font-semibold text-primary-foreground/75 uppercase tracking-wider">
                  Owed to you
                </span>
              </div>
              <p className="text-xl font-extrabold tabular-nums leading-none">
                {formatCurrency(duesSummary?.owedToMe ?? 0)}
              </p>
            </div>

            <div className="rounded-3xl bg-primary-foreground/12 p-3.5 backdrop-blur-md">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-amber-400/25">
                  <ArrowDownLeft className="size-3 text-amber-300" />
                </span>
                <span className="text-[0.68rem] font-semibold text-primary-foreground/75 uppercase tracking-wider">
                  You owe
                </span>
              </div>
              <p className="text-xl font-extrabold tabular-nums leading-none">
                {formatCurrency(duesSummary?.iOwe ?? 0)}
              </p>
            </div>
          </div>

          {/* Overdue banner */}
          <AnimatePresence>
            {overdueCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex items-center gap-2 rounded-4xl bg-red-500/20 border border-red-400/20 px-3.5 py-2.5"
              >
                <AlertTriangle className="size-4 text-red-200 shrink-0" />
                <span className="text-xs font-semibold text-red-100">
                  {overdueCount} due{overdueCount > 1 ? "s are" : " is"} overdue · check now
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </FadeInItem>

      {/* ── Tabs & view toggle ── */}
      <FadeInItem>
        <div className="sticky top-0 z-10 -mx-5 bg-background/90 backdrop-blur-xl px-5 pt-3 pb-2 border-b border-border/30">
          <div className="flex items-center justify-between gap-2">
            {/* Filter Tabs */}
            <div className="flex gap-1 overflow-x-auto scrollbar-none flex-1">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    "relative shrink-0 rounded-4xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-200",
                    activeTab === tab.value
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  {tab.label}
                  {tab.value === "all" && (duesSummary?.activeCount ?? 0) > 0 && (
                    <span className={cn(
                      "ml-1 inline-flex items-center justify-center rounded-full text-[0.55rem] font-bold min-w-4 h-4 px-0.5",
                      activeTab === "all" ? "bg-primary-foreground/25 text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {duesSummary!.activeCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* View mode toggle */}
            <div className="flex shrink-0 items-center gap-0.5 rounded-4xl border border-border/50 bg-card/60 p-0.5">
              <button
                onClick={() => setViewMode("person")}
                title="Group by person"
                className={cn(
                  "flex size-7 items-center justify-center rounded-4xl transition-all",
                  viewMode === "person" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Users className="size-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                title="Flat list"
                className={cn(
                  "flex size-7 items-center justify-center rounded-4xl transition-all",
                  viewMode === "list" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutList className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </FadeInItem>

      {/* ── Content ── */}
      <div className="flex-1 pt-4">
        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading dues...</p>
            </div>
          </div>
        ) : filteredDues.length === 0 ? (
          <FadeInItem>
            <div className="mx-1 mt-4 rounded-4xl border border-dashed border-border/70 py-14 text-center">
              <EmptyState
                icon={<HandCoins className="size-8 text-muted-foreground/60" />}
                title={
                  search
                    ? "No matching dues"
                    : activeTab === "settled"
                      ? "No settled dues yet"
                      : "No active dues"
                }
                description={
                  search
                    ? "Try a different search term"
                    : activeTab === "settled"
                      ? "Completed repayments will appear here"
                      : "Tap + to record money lent or borrowed"
                }
                action={
                  !search && activeTab !== "settled" ? (
                    <div className="mt-4 flex gap-2 justify-center flex-wrap">
                      <Button
                        onClick={() => handleOpenCreate("lent")}
                        className="gap-2 h-10 rounded-full font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <ArrowUpRight className="size-4" />
                        I Lent
                      </Button>
                      <Button
                        onClick={() => handleOpenCreate("borrowed")}
                        variant="outline"
                        className="gap-2 h-10 rounded-full font-semibold border-amber-500/50 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      >
                        <ArrowDownLeft className="size-4" />
                        I Borrowed
                      </Button>
                    </div>
                  ) : undefined
                }
              />
            </div>
          </FadeInItem>
        ) : viewMode === "person" ? (
          <FadeInStagger className="flex flex-col gap-3">
            {groupedByPerson.map((group) => {
              const isExpanded = expandedPeople[group.name.toLowerCase()] ?? true;
              const avatarColor = getAvatarColor(group.name);
              const overdueInGroup = group.dues.filter(
                (d) => d.status !== "settled" && d.dueDate && new Date(d.dueDate).getTime() < new Date().setHours(0, 0, 0, 0)
              ).length;

              return (
                <FadeInItem key={group.name}>
                  <div className="overflow-hidden rounded-4xl border border-border/50 bg-card/80 shadow-sm backdrop-blur-xl">
                    {/* Person header */}
                    <button
                      type="button"
                      onClick={() => togglePersonExpand(group.name)}
                      className="flex w-full items-center gap-3 p-4 text-left transition-colors active:bg-muted/30"
                    >
                      {/* Avatar */}
                      <div className={cn(
                        "relative flex size-11 shrink-0 items-center justify-center rounded-4xl bg-linear-to-br text-white font-bold text-sm shadow-sm",
                        avatarColor
                      )}>
                        {getInitials(group.name)}
                        {overdueInGroup > 0 && (
                          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[0.5rem] font-bold text-white">
                            !
                          </span>
                        )}
                      </div>

                      {/* Name & count */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-foreground text-sm leading-tight truncate">{group.name}</h3>
                          {group.phone && (
                            <a
                              href={`tel:${group.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted/70 text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Phone className="size-2.5" />
                            </a>
                          )}
                        </div>
                        <p className="text-[0.7rem] text-muted-foreground mt-0.5">
                          {group.dues.length} {group.dues.length === 1 ? "due" : "dues"}
                          {overdueInGroup > 0 && (
                            <span className="ml-1 text-destructive font-semibold">· {overdueInGroup} overdue</span>
                          )}
                        </p>
                      </div>

                      {/* Net amount */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className={cn(
                            "text-base font-black tabular-nums leading-tight",
                            group.net > 0 ? "text-emerald-600 dark:text-emerald-400" : group.net < 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                          )}>
                            {group.net > 0 ? "+" : ""}{formatCurrency(group.net)}
                          </div>
                          <span className="text-[0.6rem] text-muted-foreground leading-tight">
                            {group.net > 0 ? "owes you" : group.net < 0 ? "you owe" : "settled"}
                          </span>
                        </div>
                        <ChevronDown className={cn("size-4 text-muted-foreground/60 transition-transform duration-200 shrink-0", isExpanded && "rotate-180")} />
                      </div>
                    </button>

                    {/* Expanded dues */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: "easeInOut" }}
                          className="border-t border-border/30 overflow-hidden"
                        >
                          <div className="divide-y divide-border/20 bg-muted/8">
                            {group.dues.map((due) => (
                              <DueRow
                                key={due.id}
                                due={due}
                                onSettle={() => handleOpenSettle(due)}
                                onDetail={() => handleOpenDetail(due)}
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </FadeInItem>
              );
            })}
          </FadeInStagger>
        ) : (
          <FadeInStagger className="flex flex-col gap-2.5">
            {filteredDues.map((due) => (
              <FadeInItem key={due.id}>
                <div className="rounded-4xl border border-border/50 bg-card/80 shadow-sm backdrop-blur-xl overflow-hidden">
                  <DueRow
                    due={due}
                    onSettle={() => handleOpenSettle(due)}
                    onDetail={() => handleOpenDetail(due)}
                  />
                </div>
              </FadeInItem>
            ))}
          </FadeInStagger>
        )}
      </div>

      {/* ── Floating action buttons ── */}
      <div className="fixed bottom-24 right-5 z-20 flex flex-col gap-2.5 items-end">
        <AnimatePresence>
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
            onClick={() => handleOpenCreate("borrowed")}
            className="flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2.5 text-white shadow-lg shadow-amber-500/30 active:scale-95 transition-transform"
          >
            <ArrowDownLeft className="size-4" />
            <span className="text-sm font-bold">I Borrowed</span>
          </motion.button>

          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={() => handleOpenCreate("lent")}
            className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-white shadow-lg shadow-emerald-600/30 active:scale-95 transition-transform"
          >
            <ArrowUpRight className="size-4" />
            <span className="text-sm font-bold">I Lent</span>
          </motion.button>
        </AnimatePresence>
      </div>

      {/* ── Sheets ── */}
      <CreateDueSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultDirection={createDirection}
        defaultPerson={selectedPerson}
      />
      <SettleDueSheet
        open={settleOpen}
        onOpenChange={setSettleOpen}
        due={selectedDueForSettle}
      />
      <DueDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        dueId={selectedDueId}
        onOpenSettle={handleOpenSettle}
      />
    </FadeInStagger>
  );
}

// ── Due row sub-component ──
function DueRow({ due, onSettle, onDetail }: { due: Debt; onSettle: () => void; onDetail: () => void }) {
  const isLent = due.direction === "lent";
  const remaining = Math.max(0, due.principal - (due.settledAmount ?? 0));
  const progressPercent = due.principal > 0
    ? Math.min(100, Math.round(((due.settledAmount ?? 0) / due.principal) * 100))
    : 0;

  const isOverdue =
    due.status !== "settled" &&
    due.dueDate &&
    new Date(due.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);

  const daysOverdue = isOverdue
    ? Math.floor((Date.now() - new Date(due.dueDate!).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const isSettled = due.status === "settled";

  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-muted/20 cursor-pointer"
      onClick={onDetail}
    >
      {/* Direction icon */}
      <div className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-4xl",
        isSettled
          ? "bg-muted/60 text-muted-foreground"
          : isLent
            ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
            : "bg-amber-500/12 text-amber-600 dark:text-amber-400"
      )}>
        {isSettled ? (
          <CheckCircle2 className="size-4.5" />
        ) : isLent ? (
          <ArrowUpRight className="size-4.5" />
        ) : (
          <ArrowDownLeft className="size-4.5" />
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-foreground truncate">{due.counterparty.name}</span>
          {due.status === "partially_settled" && (
            <Badge variant="secondary" className="text-[0.55rem] px-1.5 py-0 h-4 rounded-full shrink-0">partial</Badge>
          )}
          {isSettled && (
            <Badge variant="default" className="text-[0.55rem] px-1.5 py-0 h-4 rounded-full shrink-0 bg-emerald-600">settled</Badge>
          )}
          {isOverdue && (
            <span className="inline-flex items-center gap-0.5 text-[0.55rem] font-bold text-destructive bg-destructive/10 rounded-full px-1.5 py-0.5 shrink-0">
              <AlertTriangle className="size-2.5" />{daysOverdue}d late
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[0.68rem] text-muted-foreground">
          <Clock className="size-2.5 shrink-0" />
          <span>{formatRelativeCompact(due.date)}</span>
          {due.dueDate && (
            <span className={cn(isOverdue ? "text-destructive font-semibold" : "")}>
              · due {formatRelativeCompact(due.dueDate)}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {!isSettled && progressPercent > 0 && (
          <div className="flex items-center gap-2 pt-1">
            <div className="h-1 flex-1 max-w-20 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isLent ? "bg-emerald-500" : "bg-amber-500"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[0.6rem] text-muted-foreground tabular-nums">{progressPercent}%</span>
          </div>
        )}
      </div>

      {/* Amount + settle button */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right">
          <div className={cn(
            "text-sm font-bold tabular-nums",
            isSettled ? "text-muted-foreground line-through" : "text-foreground"
          )}>
            {formatCurrency(remaining)}
          </div>
          {(due.settledAmount ?? 0) > 0 && !isSettled && (
            <div className="text-[0.6rem] text-muted-foreground tabular-nums">
              of {formatCurrency(due.principal)}
            </div>
          )}
        </div>

        {!isSettled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSettle();
            }}
            className={cn(
              "flex size-8 items-center justify-center rounded-4xl transition-all active:scale-90",
              isLent
                ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25"
                : "bg-amber-500/12 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25"
            )}
          >
            <CheckCircle2 className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

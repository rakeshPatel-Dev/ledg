import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Wallet,
  Pencil,
  Trash2,
  Search,
  X,
  Loader2,
  Check,
  Users,
  Shield,
  User,
} from "lucide-react";
import { SPACE_TYPES, spaceSchema, type Space, type SpaceType } from "@ledg/shared";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import {
  useSpaces,
  useCreateSpace,
  useUpdateSpace,
  useDeleteSpace,
} from "@/lib/queries";
import { formatCurrency } from "@/lib/format";
import { useAnalytics } from "@/lib/analytics";
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

type TabFilter = "all" | "personal" | "shared";

const TYPE_OPTIONS = SPACE_TYPES.map((t) => ({
  value: t,
  label: t.charAt(0).toUpperCase() + t.slice(1),
}));

export default function SpacesPage() {

  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: spaces, isLoading } = useSpaces();
  const analytics = useAnalytics();
  const createSpace = useCreateSpace();
  const updateSpace = useUpdateSpace();
  const deleteSpace = useDeleteSpace();

  const [tab, setTab] = useState<TabFilter>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Space | null>(null);
  const [deletingSpace, setDeletingSpace] = useState<Space | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<SpaceType>("personal");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Invitee identifier chips state for creation
  const [inviteIdentifierInput, setInviteIdentifierInput] = useState("");
  const [inviteIdentifiers, setInviteIdentifiers] = useState<string[]>([]);

  // Filter spaces based on tab and search query
  const filteredSpaces = useMemo(() => {
    if (!spaces) return [];
    let list = spaces;

    if (tab === "personal") {
      list = list.filter((s) => !s.isShared);
    } else if (tab === "shared") {
      list = list.filter((s) => s.isShared);
    }

    if (!searchQuery.trim()) return list;

    return list.filter((space) =>
      space.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [spaces, tab, searchQuery]);

  const personalCount = useMemo(
    () => (spaces || []).filter((s) => !s.isShared).length,
    [spaces]
  );
  const sharedCount = useMemo(
    () => (spaces || []).filter((s) => s.isShared).length,
    [spaces]
  );

  const openCreate = () => {
    setEditing(null);
    setName("");
    setType("personal");
    setMonthlyBudget("");
    setInviteIdentifierInput("");
    setInviteIdentifiers([]);
    setSheetOpen(true);
  };

  const openEdit = (e: React.MouseEvent, space: Space) => {
    e.stopPropagation();
    setEditing(space);
    setName(space.name);
    setType(space.type);
    setMonthlyBudget(
      space.monthlyBudget != null ? String(space.monthlyBudget) : ""
    );
    setSheetOpen(true);
  };

  const handleSpaceClick = (space: Space) => {
    navigate(`/spaces/${space.id}`);
  };

  const handleAddInviteChip = () => {
    const raw = inviteIdentifierInput.trim();
    if (!raw) return;

    const isUsername = raw.startsWith("@") || !raw.includes("@");
    let identifierToSave = "";

    if (isUsername) {
      const cleanUsername = (raw.startsWith("@") ? raw.slice(1) : raw).toLowerCase();
      if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
        toast.error("Usernames must be 3-30 letters, numbers, or underscores");
        return;
      }
      if (user?.username && cleanUsername === user.username.toLowerCase()) {
        toast.error("You cannot invite yourself");
        return;
      }
      identifierToSave = `@${cleanUsername}`;
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
      identifierToSave = normalizedEmail;
    }

    if (inviteIdentifiers.includes(identifierToSave)) {
      toast.error("Already added to invite list");
      return;
    }

    if (inviteIdentifiers.length >= 10) {
      toast.error("Maximum 10 invitations per space");
      return;
    }

    setInviteIdentifiers((prev) => [...prev, identifierToSave]);
    setInviteIdentifierInput("");
  };

  const handleInviteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddInviteChip();
    }
  };


  const handleRemoveInviteChip = (identifierToRemove: string) => {
    setInviteIdentifiers((prev) => prev.filter((i) => i !== identifierToRemove));
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Space name is required");
      return;
    }

    const parsedBudget = monthlyBudget.trim() ? Number(monthlyBudget) : null;
    if (parsedBudget !== null && (isNaN(parsedBudget) || parsedBudget < 0)) {
      toast.error("Budget must be a positive number");
      return;
    }

    const parsed = spaceSchema.safeParse({
      name: trimmed,
      type,
      monthlyBudget: parsedBudget,
      inviteeIdentifiers: !editing && inviteIdentifiers.length > 0 ? inviteIdentifiers : undefined,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path = issue.path.join(".");
      const label = path === "name" ? "Space name" : path;
      toast.error(label ? `${label}: ${issue.message}` : issue.message);
      return;
    }

    try {
      if (editing) {
        await updateSpace.mutateAsync({
          id: editing.id,
          data: {
            name: parsed.data.name,
            type: parsed.data.type,
            monthlyBudget: parsed.data.monthlyBudget,
          },
        });
        toast.success("Space updated");
      } else {
        await createSpace.mutateAsync(parsed.data);
        toast.success(
          inviteIdentifiers.length > 0
            ? "Space created and invitations sent!"
            : "Space created"
        );
      }
      setSheetOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    }
  };

  const handleDelete = async () => {
    if (!deletingSpace) return;
    try {
      await deleteSpace.mutateAsync(deletingSpace.id);
      toast.success(`Deleted "${deletingSpace.name}"`);
      setDeletingSpace(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    }
  };

  const summaryFor = (id: string) =>
    analytics.bySpace.find((s) => s.space.id === id);

  return (
    <FadeInStagger className="flex flex-col gap-5">
      <FadeInItem>
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Spaces</h1>
            <p className="text-sm text-muted-foreground">
              Organise money by purpose
            </p>
          </div>
          <Button
            onClick={openCreate}
            size="icon"
            aria-label="Create space"
            className="rounded-full shadow-sm"
          >
            <Plus className="size-5" />
          </Button>
        </header>
      </FadeInItem>

      {/* Tabs Segmentation */}
      <FadeInItem>
        <Segmented
          options={[
            { value: "all", label: `All (${(spaces || []).length})` },
            { value: "personal", label: `Personal (${personalCount})` },
            { value: "shared", label: `Shared (${sharedCount})` },
          ]}
          value={tab}
          onChange={(v) => setTab(v as TabFilter)}
        />
      </FadeInItem>

      {/* Search Bar */}
      <FadeInItem>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search spaces..."
            className="pl-10 pr-10 rounded-full bg-muted/50 border-0 focus-visible:ring-1"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </FadeInItem>

      {isLoading ? (
        <div className="grid gap-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-4xl" />
          ))}
        </div>
      ) : !filteredSpaces || filteredSpaces.length === 0 ? (
        <FadeInItem>
          <Card className="rounded-4xl p-2 border border-border/60">
            <EmptyState
              icon={<Wallet className="size-7" />}
              title={
                searchQuery
                  ? "No results found"
                  : tab === "shared"
                    ? "No shared spaces yet"
                    : "No spaces yet"
              }
              description={
                searchQuery
                  ? `No spaces match "${searchQuery}"`
                  : tab === "shared"
                    ? "Invite friends or family to collaborate on a shared space."
                    : "Create a space like Personal, Trip or Business to start tracking money there."
              }
              action={
                !searchQuery ? (
                  <Button onClick={openCreate} className="rounded-full">
                    <Plus className="size-4 mr-2" />
                    Create a space
                  </Button>
                ) : (
                  <Button
                    onClick={() => setSearchQuery("")}
                    variant="outline"
                    className="rounded-full"
                  >
                    <X className="size-4 mr-2" />
                    Clear search
                  </Button>
                )
              }
            />
          </Card>
        </FadeInItem>
      ) : (
        <div className="grid gap-3">
          {filteredSpaces.map((space) => {
            const Icon = SPACE_TYPE_ICONS[space.type] ?? Wallet;
            const typeBg = SPACE_TYPE_BG[space.type];
            const typeText = SPACE_TYPE_TEXT[space.type];
            const typeBadge = SPACE_TYPE_BADGE[space.type];
            const summary = summaryFor(space.id);
            const balance = summary?.balance ?? 0;
            const balanceColor = getBalanceColor(balance);
            const isOwner = space.role === "owner" || (!space.role && space.ownerId === user?.id);
            const members = space.members || [];

            return (
              <FadeInItem key={space.id}>
                <motion.div
                  whileHover={{ y: -3, scale: 1.005 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Card
                    onClick={() => handleSpaceClick(space)}
                    className={cn(
                      "flex flex-col rounded-4xl p-4 transition-shadow shadow-xs hover:shadow-md",
                      "cursor-pointer hover:border-primary/20",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      space.isShared && "border-primary/20 bg-primary/2 dark:bg-primary/5"
                    )}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <span
                        className={cn(
                          "flex size-11 shrink-0 items-center justify-center rounded-2xl transition-colors",
                          typeBg,
                          typeText
                        )}
                      >
                        <Icon className="size-5" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-bold text-foreground text-sm">
                            {space.name}
                          </p>
                          {space.isShared && (
                            <>
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                                {isOwner ? (
                                  <span className="inline-flex items-center text-primary font-semibold">
                                    <Shield className="size-3 mr-0.5" />
                                    Owner
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-muted-foreground">
                                    <User className="size-3 mr-0.5" />
                                    Member
                                  </span>
                                )}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                              typeBadge
                            )}
                          >
                            {space.type}
                          </span>

                          <span className="text-xs text-muted-foreground/60">·</span>
                          <span className="text-xs text-muted-foreground">
                            {summary?.transactionCount ?? 0}{" "}
                            {(summary?.transactionCount ?? 0) !== 1
                              ? "txns"
                              : "txn"}
                          </span>
                        </div>

                        {/* Member Avatar Stack on Shared Space Cards */}
                        {space.isShared && members.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className="flex -space-x-2 overflow-hidden">
                              {members.slice(0, 4).map((member, idx) => {
                                const initials = (member.name || "U")
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase();
                                return (
                                  <div
                                    key={member.userId || idx}
                                    title={`${member.name} (${member.role})`}
                                    className="inline-flex size-6 items-center justify-center rounded-full ring-2 ring-card bg-primary/20 text-[10px] font-bold text-primary shadow-xs"
                                  >
                                    {initials}
                                  </div>
                                );
                              })}
                              {members.length > 4 && (
                                <div className="inline-flex size-6 items-center justify-center rounded-full ring-2 ring-card bg-muted text-[9px] font-bold text-muted-foreground">
                                  +{members.length - 4}
                                </div>
                              )}
                            </div>
                            <span className="text-[11px] font-medium text-muted-foreground">
                              {members.length} {members.length === 1 ? "member" : "members"}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <p
                          className={cn(
                            "text-base font-bold tabular-nums",
                            balanceColor
                          )}
                        >
                          {formatCurrency(balance)}
                        </p>

                        {isOwner && (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={(e) => openEdit(e, space)}
                              aria-label={`Edit ${space.name}`}
                              className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground active:scale-95 cursor-pointer"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingSpace(space);
                              }}
                              aria-label={`Delete ${space.name}`}
                              className="flex size-8 items-center justify-center rounded-full bg-destructive/10 text-destructive transition-all hover:bg-destructive/20 active:scale-95 cursor-pointer"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {space.monthlyBudget != null && space.monthlyBudget > 0 ? (() => {
                      const spent = summary?.monthExpense ?? 0;
                      const budget = space.monthlyBudget;
                      const isOver = spent > budget;
                      const percent = budget > 0
                        ? Math.round((spent / budget) * 100)
                        : isOver ? 100 : 0;
                      const overAmount = spent - budget;
                      const budgetWidth = isOver ? (budget / spent) * 100 : Math.min(100, percent);
                      const overWidth = isOver ? (overAmount / spent) * 100 : 0;

                      return (
                        <div className="mt-3 pt-2.5 border-t border-border/40 space-y-1.5 w-full">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground font-medium">Monthly budget</span>
                            <div className="flex items-center gap-1.5">
                              <span className={cn("font-bold tabular-nums", isOver ? "text-destructive" : "text-foreground")}>
                                {formatCurrency(spent)}
                              </span>
                              <span className="text-muted-foreground text-[11px]">/ {formatCurrency(budget)}</span>
                            </div>
                          </div>

                          {isOver ? (
                            <div className="h-2 w-full flex overflow-hidden rounded-full bg-muted/60 gap-0.5 p-0.5">
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
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  percent >= 75 ? "bg-amber-500" : "bg-primary"
                                )}
                                style={{ width: `${budgetWidth}%` }}
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[10px]">
                            {isOver ? (
                              <>
                                <span className="text-muted-foreground">Budget: {formatCurrency(budget)}</span>
                                <span className="font-semibold text-destructive">
                                  +{formatCurrency(overAmount)} over ({percent}%)
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
                      );
                    })() : null}
                  </Card>
                </motion.div>
              </FadeInItem>
            );
          })}
        </div>
      )}

      {/* Edit / Create Sheet */}
      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editing ? "Edit space" : "New space"}
        description={
          editing
            ? "Update space settings and monthly budget."
            : "Give this space a name, purpose, and optionally invite members."
        }
      >
        <div className="flex flex-col gap-5 pt-2">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Name
            </p>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Personal, Goa Trip, Family Budget"
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Type
            </p>
            <Segmented
              options={TYPE_OPTIONS}
              value={type}
              onChange={setType}
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
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
              placeholder="e.g. 25000"
            />
          </div>

          {/* Invitee Identifier Chips Input for New Spaces */}
          {!editing && (
            <div className="space-y-2 border-t border-border/50 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users className="size-3.5 text-primary" />
                  Invite Collaborators (Optional)
                </p>
                <span className="text-[11px] text-muted-foreground">
                  {inviteIdentifiers.length}/10
                </span>
              </div>

              <div className="flex items-center relative w-full gap-2">
                <Input
                  type="text"
                  value={inviteIdentifierInput}
                  onChange={(e) => setInviteIdentifierInput(e.target.value)}
                  onKeyDown={handleInviteKeyDown}
                  placeholder="name@email.com or @username "
                  className="z-0 w-full rounded-2xl pr-20"
                />

                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddInviteChip}
                  disabled={!inviteIdentifierInput.trim()}
                  className="rounded-2xl absolute right-2 z-10 shrink-0"
                >
                  Add
                </Button>
              </div>

              {inviteIdentifiers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {inviteIdentifiers.map((identifier) => (
                    <span
                      key={identifier}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20"
                    >
                      {identifier}
                      <button
                        type="button"
                        onClick={() => handleRemoveInviteChip(identifier)}
                        className="rounded-full hover:bg-primary/20 p-0.5 text-primary/70 hover:text-primary transition-colors"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button
            size="lg"
            className="mt-2 w-full rounded-full text-base font-semibold"
            onClick={submit}
            disabled={createSpace.isPending || updateSpace.isPending}
          >
            {createSpace.isPending || updateSpace.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                {editing ? "Saving…" : "Creating…"}
              </>
            ) : editing ? (
              <>
                <Check className="size-4 mr-2" />
                Save changes
              </>
            ) : (
              <>
                <Plus className="size-4 mr-2" />
                Create space
              </>
            )}
          </Button>
        </div>
      </Sheet>

      {/* Delete Confirmation Sheet */}
      <Sheet
        open={!!deletingSpace}
        onOpenChange={(open) => !open && setDeletingSpace(null)}
        title="Delete Space"
        description={
          deletingSpace
            ? deletingSpace.isShared
              ? `This will permanently delete the shared space "${deletingSpace.name}" for all members and remove all transactions.`
              : `This will permanently delete "${deletingSpace.name}" and all ${summaryFor(deletingSpace.id)?.transactionCount ?? 0} transactions in it.`
            : undefined
        }
      >
        <div className="flex flex-col gap-3 pt-3">
          <Button
            variant="destructive-solid"
            size="lg"
            className="w-full rounded-full text-base font-semibold"
            onClick={handleDelete}
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
            onClick={() => setDeletingSpace(null)}
          >
            <X className="size-4 mr-2" />
            Cancel
          </Button>
        </div>
      </Sheet>
    </FadeInStagger>
  );
}
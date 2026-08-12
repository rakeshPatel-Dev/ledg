import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Wallet, Pencil, Trash2 } from "lucide-react";
import { SPACE_TYPES, type Space, type SpaceType } from "@ledg/shared";
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
import { cn } from "@/lib/utils";
import { FadeInStagger, FadeInItem } from "@/components/common/page-transition";
import {
  SPACE_TYPE_ICONS,
  SPACE_TYPE_BG,
  SPACE_TYPE_TEXT,
  SPACE_TYPE_BADGE,
  getBalanceColor,
} from "@/lib/space-colors";

const TYPE_OPTIONS = SPACE_TYPES.map((t) => ({
  value: t,
  label: t.charAt(0).toUpperCase() + t.slice(1),
}));

export default function SpacesPage() {
  const navigate = useNavigate();
  const { data: spaces, isLoading } = useSpaces();
  const analytics = useAnalytics();
  const createSpace = useCreateSpace();
  const updateSpace = useUpdateSpace();
  const deleteSpace = useDeleteSpace();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Space | null>(null);
  const [deletingSpace, setDeletingSpace] = useState<Space | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<SpaceType>("personal");

  const openCreate = () => {
    setEditing(null);
    setName("");
    setType("personal");
    setSheetOpen(true);
  };

  const openEdit = (e: React.MouseEvent, space: Space) => {
    e.stopPropagation();
    setEditing(space);
    setName(space.name);
    setType(space.type);
    setSheetOpen(true);
  };

  const handleSpaceClick = (space: Space) => {
    navigate(`/spaces/${space.id}`);
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Space name is required");
      return;
    }
    try {
      if (editing) {
        await updateSpace.mutateAsync({
          id: editing.id,
          data: { name: trimmed, type },
        });
        toast.success("Space updated");
      } else {
        await createSpace.mutateAsync({ name: trimmed, type });
        toast.success("Space created");
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

      {isLoading ? (
        <div className="grid gap-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-4xl" />
          ))}
        </div>
      ) : !spaces || spaces.length === 0 ? (
        <FadeInItem>
          <EmptyState
            icon={<Wallet className="size-7" />}
            title="No spaces yet"
            description="Create a space like Personal, Trip or Business to start tracking money there."
            action={
              <Button onClick={openCreate} className="rounded-full">
                Create your first space
              </Button>
            }
          />
        </FadeInItem>
      ) : (
        <div className="grid gap-3">
          {spaces.map((space) => {
            const Icon = SPACE_TYPE_ICONS[space.type] ?? Wallet;
            const typeBg = SPACE_TYPE_BG[space.type];
            const typeText = SPACE_TYPE_TEXT[space.type];
            const typeBadge = SPACE_TYPE_BADGE[space.type];
            const summary = summaryFor(space.id);
            const balance = summary?.balance ?? 0;
            const balanceColor = getBalanceColor(balance);

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
                      "flex items-center gap-4 rounded-4xl p-5 transition-shadow shadow-xs hover:shadow-md",
                      "cursor-pointer hover:border-primary/20",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-12 shrink-0 items-center justify-center rounded-2xl transition-colors",
                        typeBg,
                        typeText
                      )}
                    >
                      <Icon className="size-5" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground text-base">
                        {space.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
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
                          {summary?.transactionCount ?? 0} transaction
                          {(summary?.transactionCount ?? 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
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
                    </div>
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
        description="Give this space a name and purpose."
      >
        <div className="flex flex-col gap-5 pt-2">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Name
            </p>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Personal, Goa Trip"
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

          <Button
            size="lg"
            className="mt-2 w-full rounded-full text-base font-semibold"
            onClick={submit}
            disabled={createSpace.isPending || updateSpace.isPending}
          >
            {editing ? "Save changes" : "Create space"}
          </Button>
        </div>
      </Sheet>

      {/* Delete Confirmation Sheet */}
      <Sheet
        open={!!deletingSpace}
        onOpenChange={(open) => !open && setDeletingSpace(null)}
        title="Delete Space"
        description={`Are you sure you want to delete "${deletingSpace?.name}"? All associated transactions will remain, but this space bucket will be removed.`}
      >
        <div className="flex flex-col gap-3 pt-3">
          <Button
            variant="destructive-solid"
            size="lg"
            className="w-full rounded-full text-base font-semibold"
            onClick={handleDelete}
            disabled={deleteSpace.isPending}
          >
            Delete Space
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full rounded-full text-base font-semibold"
            onClick={() => setDeletingSpace(null)}
          >
            Cancel
          </Button>
        </div>
      </Sheet>
    </FadeInStagger>
  );
}

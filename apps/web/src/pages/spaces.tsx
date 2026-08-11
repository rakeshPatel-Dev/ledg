import { useState } from "react";
import {
  Plus,
  Wallet,
  Plane,
  Building2,
  Users,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  SPACE_TYPES,
  type Space,
  type SpaceType,
} from "@ledg/shared";
import { toast } from "sonner";

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

const TYPE_ICONS: Record<SpaceType, typeof Wallet> = {
  personal: Wallet,
  family: Users,
  trip: Plane,
  business: Building2,
};

const TYPE_OPTIONS = SPACE_TYPES.map((t) => ({
  value: t,
  label: t.charAt(0).toUpperCase() + t.slice(1),
}));

export default function SpacesPage() {
  const { data: spaces, isLoading } = useSpaces();
  const analytics = useAnalytics();
  const createSpace = useCreateSpace();
  const updateSpace = useUpdateSpace();
  const deleteSpace = useDeleteSpace();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Space | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<SpaceType>("personal");

  const openCreate = () => {
    setEditing(null);
    setName("");
    setType("personal");
    setSheetOpen(true);
  };

  const openEdit = (space: Space) => {
    setEditing(space);
    setName(space.name);
    setType(space.type);
    setSheetOpen(true);
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Space name is required");
      return;
    }
    try {
      if (editing) {
        await updateSpace.mutateAsync({ id: editing.id, data: { name: trimmed, type } });
        toast.success("Space updated");
      } else {
        await createSpace.mutateAsync({ name: trimmed, type });
        toast.success("Space created");
      }
      setSheetOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  const handleDelete = async (space: Space) => {
    if (!window.confirm(`Delete "${space.name}"? This can't be undone.`)) return;
    try {
      await deleteSpace.mutateAsync(space.id);
      toast.success("Space deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  const summaryFor = (id: string) =>
    analytics.bySpace.find((s) => s.space.id === id);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Spaces</h1>
          <p className="text-sm text-muted-foreground">
            Organise money by purpose
          </p>
        </div>
        <Button onClick={openCreate} size="icon" aria-label="Create space">
          <Plus className="size-5" />
        </Button>
      </header>

      {isLoading ? (
        <div className="grid gap-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-4xl" />
          ))}
        </div>
      ) : !spaces || spaces.length === 0 ? (
        <EmptyState
          icon={<Wallet className="size-7" />}
          title="No spaces yet"
          description="Create a space like Personal, Trip or Business to start tracking money there."
          action={<Button onClick={openCreate}>Create your first space</Button>}
        />
      ) : (
        <div className="grid gap-3">
          {spaces.map((space) => {
            const Icon = TYPE_ICONS[space.type];
            const summary = summaryFor(space.id);
            return (
              <Card
                key={space.id}
                className="flex items-center gap-4 rounded-4xl p-5"
              >
                <span
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-2xl",
                    "bg-primary/10 text-primary"
                  )}
                >
                  <Icon className="size-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{space.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {space.type}
                    {summary?.transactionCount
                      ? ` · ${summary.transactionCount} transactions`
                      : ""}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <p className="text-base font-bold tabular-nums">
                    {formatCurrency(summary?.balance ?? 0)}
                  </p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(space)}
                      aria-label={`Edit ${space.name}`}
                      className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(space)}
                      aria-label={`Delete ${space.name}`}
                      className="flex size-8 items-center justify-center rounded-full bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editing ? "Edit space" : "New space"}
        description="Give this space a name and purpose."
      >
        <div className="flex flex-col gap-5">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Name</p>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Personal, Goa Trip"
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Type</p>
            <Segmented
              options={TYPE_OPTIONS}
              value={type}
              onChange={setType}
            />
          </div>

          <Button
            size="lg"
            className="mt-1 w-full"
            onClick={submit}
            disabled={createSpace.isPending || updateSpace.isPending}
          >
            {editing ? "Save changes" : "Create space"}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

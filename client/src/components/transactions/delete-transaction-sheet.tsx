import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import type { Transaction } from "@ledg/shared";
import { toast } from "sonner";

import { DEFAULT_CURRENCY } from "@ledg/shared";

import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useDeleteTransaction } from "@/lib/queries";
import { getCategoryMeta } from "@/lib/categories";
import { formatCurrency } from "@/lib/format";

interface DeleteTransactionSheetProps {
  transaction: Transaction | null;
  onOpenChange: (open: boolean) => void;
}

export function DeleteTransactionSheet({
  transaction,
  onOpenChange,
}: DeleteTransactionSheetProps) {
  const [isPending, setIsPending] = useState(false);
  const deleteTransaction = useDeleteTransaction(transaction?.spaceId ?? "");

  const handleDelete = async () => {
    if (!transaction) return;
    setIsPending(true);
    try {
      await deleteTransaction.mutateAsync(transaction.id);
      toast.success("Transaction deleted");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete transaction");
    } finally {
      setIsPending(false);
    }
  };

  const meta = transaction ? getCategoryMeta(transaction.category) : null;

  return (
    <Sheet
      open={Boolean(transaction)}
      onOpenChange={onOpenChange}
      title="Delete Transaction"
      description="This will permanently remove the transaction."
    >
      {transaction && meta ? (
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex items-center gap-3 rounded-3xl border border-border/60 bg-card p-4">
            <span
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${meta.color}1f`, color: meta.color }}
            >
              <meta.icon className="size-5" strokeWidth={2.2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {transaction.note || transaction.category}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {transaction.category}
                {transaction.paymentMethod
                  ? ` · ${transaction.paymentMethod.replace("_", " ")}`
                  : ""}
              </p>
            </div>
            <span
              className={`shrink-0 text-sm font-bold tabular-nums ${
                transaction.type === "income" ? "text-success" : "text-destructive"
              }`}
            >
              {transaction.type === "income" ? "+" : "−"}
              {formatCurrency(transaction.amount, DEFAULT_CURRENCY)}
            </span>
          </div>

          <div className="flex flex-col gap-3 pt-1">
            <Button
              variant="destructive-solid"
              size="lg"
              className="w-full rounded-full text-base font-semibold"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Delete Transaction
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full rounded-full text-base font-semibold"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}

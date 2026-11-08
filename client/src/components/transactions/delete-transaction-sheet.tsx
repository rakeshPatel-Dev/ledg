import { useState } from "react";
import { Trash2, Loader2, X, HandCoins } from "lucide-react";
import type { Transaction } from "@ledg/shared";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import { DEFAULT_CURRENCY } from "@ledg/shared";

import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCreateTransaction, useDeleteTransaction } from "@/lib/queries";
import { getUserFacingError } from "@/lib/errors";
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
  const createTransaction = useCreateTransaction();
  const navigate = useNavigate();
  const isLoan = transaction?.source === "dues";

  const restoreTransaction = async (snapshot: Transaction) => {
    try {
      await createTransaction.mutateAsync({
        spaceId: snapshot.spaceId,
        data: {
          type: snapshot.type,
          category: snapshot.category,
          amount: snapshot.amount,
          note: snapshot.note ?? "",
          date: snapshot.date,
          paymentMethod: snapshot.paymentMethod ?? undefined,
          source: snapshot.source ?? "manual",
        },
      });
      toast.success("Transaction restored");
    } catch (error) {
      toast.error(getUserFacingError(error, "Couldn't restore the transaction."));
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;
    const snapshot = transaction;
    setIsPending(true);
    try {
      await deleteTransaction.mutateAsync(snapshot.id);
      onOpenChange(false);
      toast.success("Transaction deleted", {
        action: {
          label: "Undo",
          onClick: () => {
            void restoreTransaction(snapshot);
          },
        },
      });
    } catch (error) {
      toast.error(getUserFacingError(error, "Failed to delete the transaction."));
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
      description={
        isLoan
          ? "This entry is linked to a due. Delete or settle the due instead."
          : "This will permanently remove the transaction."
      }
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
            {isLoan ? (
              <Button
                size="lg"
                className="w-full rounded-full text-base font-semibold"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/dues");
                }}
              >
                <HandCoins className="size-4 mr-2" />
                Go to Dues
              </Button>
            ) : (
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
            )}
            <Button
              variant="outline"
              size="lg"
              className="w-full rounded-full text-base font-semibold"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              <X className="size-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}

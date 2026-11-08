import type { Transaction } from "@ledg/shared";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, User, UserShield } from "lucide-react";

import { getCategoryMeta } from "@/lib/categories";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/lib/auth-provider";
import { useSpaceLookup } from "@/lib/queries";
import { cn } from "@/lib/utils";

interface TransactionItemProps {
  transaction: Transaction;
  currency?: string;
  onClick?: () => void;
  showAttribution?: boolean;
  /** Extra classes, e.g. right padding for a visible actions button. */
  className?: string;
  /** Enables the Delete key while the row is focused. */
  onRequestDelete?: () => void;
}

export function TransactionItem({
  transaction,
  currency,
  onClick,
  showAttribution = true,
  className,
  onRequestDelete,
}: TransactionItemProps) {
  const { user } = useAuth();
  const spaces = useSpaceLookup();
  const meta = getCategoryMeta(transaction.category, transaction.type);
  const Icon = meta.icon;
  const isIncome = transaction.type === "income";
  const isLoan = transaction.source === "dues";
  const displayCategory = isLoan
    ? isIncome
      ? "Loan in"
      : "Loan out"
    : transaction.category;

  const creator = transaction.createdBy;
  const space = spaces.get(transaction.spaceId);
  // Attribution only carries meaning where several people add transactions —
  // a personal space has a single author, which is always you.
  const isSharedSpace = Boolean(space?.isShared);
  const isOtherCreator = Boolean(
    showAttribution &&
    isSharedSpace &&
    creator?.userId &&
    user?.userId &&
    creator.userId !== user.userId
  );
  const creatorIsOwner = Boolean(space && creator && space.ownerId === creator.userId);

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      type="button"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Delete" && onRequestDelete) {
          e.preventDefault();
          onRequestDelete();
        }
      }}
      className={cn(
        "flex w-full items-center gap-3.5 rounded-3xl border border-border/70 bg-card surface-card px-3 py-3 text-left transition-[box-shadow,border-color,background-color] duration-200 hover:border-border hover:shadow-elev-card-hover cursor-pointer select-none",
        className
      )}
    >
      <span
        className="flex size-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-black/5 ring-inset dark:ring-white/5"
        style={{ backgroundColor: `${meta.color}1f`, color: meta.color }}
      >
        <Icon className="size-5" strokeWidth={2.2} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">
          {transaction.note || displayCategory}
        </span>
        <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground mt-0.5">
          <span>{displayCategory}</span>
          {isLoan && (
            <span className="inline-flex items-center rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
              Loan
            </span>
          )}
          {transaction.paymentMethod && (
            <>
              <span className="text-muted-foreground/60">·</span>
              <span>{transaction.paymentMethod.replace("_", " ")}</span>
            </>
          )}
          {isOtherCreator && creator && (
            <>
              <span className="text-muted-foreground/60">·</span>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.2 rounded-md">
                {creatorIsOwner ? (
                  <UserShield className="size-2.5" />
                ) : (
                  <User className="size-2.5" />
                )}
                {creator.username ? `@${creator.username}` : creator.name || "Member"}
              </span>
            </>
          )}
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-0.5">
        <span
          className={cn(
            "text-sm font-bold tabular-nums",
            isIncome ? "text-success" : "text-destructive"
          )}
        >
          {isIncome ? "+" : "−"}
          {formatCurrency(transaction.amount, currency)}
        </span>
        <span className="flex items-center gap-1 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
          {isIncome ? (
            <ArrowDownLeft className="size-3" />
          ) : (
            <ArrowUpRight className="size-3" />
          )}
          {new Date(transaction.date).toLocaleDateString("en-NP", {
            day: "numeric",
            month: "short",
          })}
        </span>
      </span>
    </motion.button>
  );
}

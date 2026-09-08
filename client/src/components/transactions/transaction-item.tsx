import type { Transaction } from "@ledg/shared";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, User } from "lucide-react";

import { getCategoryMeta } from "@/lib/categories";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/lib/auth-provider";
import { cn } from "@/lib/utils";

interface TransactionItemProps {
  transaction: Transaction;
  currency?: string;
  onClick?: () => void;
  showAttribution?: boolean;
}

export function TransactionItem({
  transaction,
  currency,
  onClick,
  showAttribution = true,
}: TransactionItemProps) {
  const { user } = useAuth();
  const meta = getCategoryMeta(transaction.category);
  const Icon = meta.icon;
  const isIncome = transaction.type === "income";

  const isOtherCreator =
    showAttribution &&
    transaction.createdBy?.userId &&
    user?.id &&
    transaction.createdBy.userId !== user.id;

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3.5 rounded-3xl border border-white/20 dark:border-white/10 bg-card/75 px-3 py-3 text-left shadow-xs backdrop-blur-md transition-all hover:bg-card/90 hover:shadow-md cursor-pointer select-none"
    >
      <span
        className="flex size-12 shrink-0 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${meta.color}1f`, color: meta.color }}
      >
        <Icon className="size-5" strokeWidth={2.2} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">
          {transaction.note || transaction.category}
        </span>
        <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground mt-0.5">
          <span>{transaction.category}</span>
          {transaction.paymentMethod && (
            <>
              <span className="text-muted-foreground/60">·</span>
              <span>{transaction.paymentMethod.replace("_", " ")}</span>
            </>
          )}
          {isOtherCreator && (
            <>
              <span className="text-muted-foreground/60">·</span>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.2 rounded-md">
                <User className="size-2.5" />
                {transaction.createdBy?.username
                  ? `@${transaction.createdBy.username}`
                  : transaction.createdBy?.name || "Member"}
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

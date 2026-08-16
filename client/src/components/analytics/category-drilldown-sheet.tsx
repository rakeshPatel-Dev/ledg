import { ArrowUpRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { DEFAULT_CURRENCY } from "@ledg/shared";

import { Sheet } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { getCategoryMeta } from "@/lib/categories";
import { formatCurrency } from "@/lib/format";
import type { Transaction } from "@ledg/shared";

interface CategoryDrilldownSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: string | null;
  transactions: Transaction[];
}

export function CategoryDrilldownSheet({
  open,
  onOpenChange,
  category,
  transactions,
}: CategoryDrilldownSheetProps) {
  const currency = DEFAULT_CURRENCY;
  if (!category) return null;

  const meta = getCategoryMeta(category);
  const categoryTxs = transactions
    .filter((t) => t.category === category && t.type === "expense")
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));

  const total = categoryTxs.reduce((s, t) => s + t.amount, 0);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={category}
      description={`${categoryTxs.length} transaction${categoryTxs.length === 1 ? "" : "s"} · ${formatCurrency(total, currency)} total`}
    >
      <div className="flex flex-col gap-3 pt-2">
        {/* Category icon + total */}
        <div className="flex items-center gap-3 rounded-3xl bg-accent/50 p-4">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
          >
            <meta.icon className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Total spent</p>
            <p className="text-xl font-bold tabular-nums">
              {formatCurrency(total, currency)}
            </p>
          </div>
        </div>

        {/* Transactions list */}
        {categoryTxs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No transactions in this category
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {categoryTxs.slice(0, 20).map((t) => (
              <Card
                key={t.id}
                className="flex items-center justify-between rounded-3xl px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {t.note || category}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums text-destructive">
                    -{formatCurrency(t.amount, currency)}
                  </span>
                  <ArrowUpRight className="size-3.5 text-destructive/50" />
                </div>
              </Card>
            ))}

            {/* See all link */}
            {categoryTxs.length > 0 && (
              <Link
                to={`/transactions?category=${encodeURIComponent(category)}`}
                className="flex items-center justify-center gap-1.5 pt-2 text-sm font-medium text-primary hover:underline"
                onClick={() => onOpenChange(false)}
              >
                See all in Transactions
                <ExternalLink className="size-3.5" />
              </Link>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}

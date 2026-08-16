import { RefreshCw } from "lucide-react";
import { DEFAULT_CURRENCY } from "@ledg/shared";

import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { getCategoryMeta } from "@/lib/categories";
import type { RecurringGroup } from "@/lib/api";

interface RecurringCardProps {
  groups: RecurringGroup[];
}

export function RecurringCard({ groups }: RecurringCardProps) {
  if (groups.length === 0) return null;

  const currency = DEFAULT_CURRENCY;
  const totalMonthly = groups.reduce((s, g) => s + g.amount, 0);

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <RefreshCw className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recurring
        </h2>
      </div>

      <Card className="overflow-hidden rounded-4xl p-0">
        {/* Summary header */}
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {groups.length} recurring pattern{groups.length > 1 ? "s" : ""} detected
          </p>
          <p className="text-sm font-semibold tabular-nums">
            ~{formatCurrency(totalMonthly, currency)}/avg
          </p>
        </div>

        {/* Group rows */}
        <div className="flex flex-col divide-y divide-border/30">
          {groups.slice(0, 5).map((group) => {
            const meta = getCategoryMeta(group.category);
            return (
              <div
                key={group.key}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: `${meta.color}22`,
                    color: meta.color,
                  }}
                >
                  <meta.icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {group.note || group.category}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {group.count}× · {group.category}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatCurrency(group.amount, currency)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">avg/time</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
}

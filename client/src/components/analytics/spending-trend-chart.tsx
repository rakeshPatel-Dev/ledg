import { useId } from "react";
import { DEFAULT_CURRENCY } from "@ledg/shared";
import { TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatCompact, formatCurrency } from "@/lib/format";
import type { AnalyticsSummary } from "@/lib/api";

type TrendPoint = AnalyticsSummary["trend"][number];
type Granularity = AnalyticsSummary["trendGranularity"];

interface SpendingTrendChartProps {
  points: TrendPoint[];
  granularity: Granularity;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const WIDTH = 320;
const HEIGHT = 140;
const PAD = { top: 14, right: 8, bottom: 22, left: 8 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

function formatLabel(key: string, granularity: Granularity): string {
  if (granularity === "hour") return `${key.slice(11, 13)}:00`;

  if (granularity === "month") {
    const [, month] = key.split("-").map(Number);
    return MONTHS[(month ?? 1) - 1] ?? key;
  }

  const [, month, day] = key.split("-").map(Number);
  return `${day} ${MONTHS[(month ?? 1) - 1] ?? ""}`.trim();
}

function formatFullLabel(key: string, granularity: Granularity): string {
  if (granularity === "hour") return key.replace("T", " ");
  if (granularity === "month") {
    const [year, month] = key.split("-").map(Number);
    return `${MONTHS[(month ?? 1) - 1]} ${year}`;
  }
  return key;
}

export function SpendingTrendChart({ points, granularity }: SpendingTrendChartProps) {
  const rawId = useId();
  const gradientId = `trend-${rawId.replace(/:/g, "")}`;

  if (points.length === 0) return null;

  const currency = DEFAULT_CURRENCY;
  const maxValue = Math.max(
    ...points.map((point) => Math.max(point.income, point.expense)),
    1
  );
  const baseline = PAD.top + PLOT_H;
  const xAt = (index: number) =>
    points.length === 1
      ? PAD.left + PLOT_W / 2
      : PAD.left + (index / (points.length - 1)) * PLOT_W;
  const yAt = (value: number) => baseline - (value / maxValue) * PLOT_H;

  const toPolyline = (key: "income" | "expense") =>
    points.map((point, index) => `${xAt(index)},${yAt(point[key])}`).join(" ");

  const expenseLine = toPolyline("expense");
  const incomeLine = toPolyline("income");
  const expenseArea = `M ${xAt(0)},${baseline} L ${points
    .map((point, index) => `${xAt(index)},${yAt(point.expense)}`)
    .join(" L ")} L ${xAt(points.length - 1)},${baseline} Z`;

  const totalIncome = points.reduce((sum, point) => sum + point.income, 0);
  const totalExpense = points.reduce((sum, point) => sum + point.expense, 0);

  // Show at most four x-axis ticks so labels never overlap on mobile.
  const tickIndexes = [
    ...new Set(
      [
        0,
        Math.floor((points.length - 1) / 3),
        Math.floor(((points.length - 1) * 2) / 3),
        points.length - 1,
      ].filter((index) => index >= 0 && index < points.length)
    ),
  ];
  const showDots = points.length <= 12;

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Spending trend
      </h2>
      <Card className="rounded-4xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">Income vs expense</p>
              <p className="text-[11px] text-muted-foreground">
                Peak {formatCompact(maxValue, currency)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: "var(--success)" }}
              />
              Income
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: "var(--destructive)" }}
              />
              Expense
            </span>
          </div>
        </div>

        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Income vs expense trend. Income ${formatCurrency(
            totalIncome,
            currency
          )}, expense ${formatCurrency(totalExpense, currency)}.`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--destructive)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--destructive)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Faint grid lines at 0 / 50 / 100% of the peak. */}
          {[0, 0.5, 1].map((ratio) => (
            <line
              key={ratio}
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={baseline - ratio * PLOT_H}
              y2={baseline - ratio * PLOT_H}
              className="stroke-border/50"
              strokeWidth={0.5}
              strokeDasharray={ratio === 0 ? undefined : "2 3"}
            />
          ))}

          <path d={expenseArea} fill={`url(#${gradientId})`} />
          <polyline
            points={expenseLine}
            fill="none"
            stroke="var(--destructive)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <polyline
            points={incomeLine}
            fill="none"
            stroke="var(--success)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {showDots &&
            points.map((point, index) => (
              <g key={point.key}>
                <circle
                  cx={xAt(index)}
                  cy={yAt(point.expense)}
                  r={2.5}
                  fill="var(--destructive)"
                />
                <circle
                  cx={xAt(index)}
                  cy={yAt(point.income)}
                  r={2.5}
                  fill="var(--success)"
                />
              </g>
            ))}

          {/* Invisible hit targets give every point a native hover title. */}
          {points.map((point, index) => {
            const step = points.length > 1 ? PLOT_W / (points.length - 1) : PLOT_W;
            return (
              <rect
                key={`hit-${point.key}`}
                x={xAt(index) - step / 2}
                y={PAD.top}
                width={Math.max(step, 6)}
                height={PLOT_H}
                fill="transparent"
              >
                <title>
                  {`${formatFullLabel(point.key, granularity)} — Income ${formatCurrency(
                    point.income,
                    currency
                  )}, Expense ${formatCurrency(point.expense, currency)}`}
                </title>
              </rect>
            );
          })}

          {tickIndexes.map((index, tickPosition) => {
            const isFirst = tickPosition === 0;
            const isLast = tickPosition === tickIndexes.length - 1;
            return (
              <text
                key={`tick-${index}`}
                x={xAt(index)}
                y={HEIGHT - 6}
                fontSize={8}
                textAnchor={isFirst ? "start" : isLast ? "end" : "middle"}
                className="fill-muted-foreground"
              >
                {formatLabel(points[index].key, granularity)}
              </text>
            );
          })}
        </svg>
      </Card>
    </section>
  );
}

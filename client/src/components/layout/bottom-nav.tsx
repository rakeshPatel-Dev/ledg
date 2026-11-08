import { useState } from "react";
import { Link, NavLink, matchPath, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChartNoAxesCombined,
  ChevronRight,
  Ellipsis,
  HandCoins,
  House,
  Layers,
  Plus,
  Settings2,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useTransactionForm } from "@/lib/transaction-form";
import { useDuesSummary } from "@/lib/queries";

type NavItem =
  | { type: "link"; to: string; label: string; icon: LucideIcon; end: boolean }
  | { type: "add" }
  | { type: "more" };

interface MoreItem {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { type: "link", to: "/", label: "Home", icon: House, end: true },
  {
    type: "link",
    to: "/transactions",
    label: "Activity",
    icon: Wallet,
    end: false,
  },
  { type: "add" },
  { type: "link", to: "/spaces", label: "Spaces", icon: Layers, end: false },
  { type: "more" },
];

const MORE_ITEMS: MoreItem[] = [
  {
    to: "/analytics",
    label: "Insights",
    description: "Spending trends and breakdowns",
    icon: ChartNoAxesCombined,
  },
  {
    to: "/dues",
    label: "Dues",
    description: "Money lent and borrowed",
    icon: HandCoins,
  },
  {
    to: "/settings",
    label: "Settings",
    description: "Account, preferences, and data",
    icon: Settings2,
  },
];

const isMoreSection = (pathname: string) =>
  ["/dues", "/analytics", "/settings", "/profile"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

export function BottomNav() {
  const { openCreate } = useTransactionForm();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data: duesSummary } = useDuesSummary();
  const [moreOpen, setMoreOpen] = useState(false);

  const overdueCount = duesSummary?.overdueCount ?? 0;
  const isDuesPage = pathname === "/dues";
  const isMoreActive = isMoreSection(pathname);
  const spaceMatch = matchPath("/spaces/:id", pathname);
  const spaceId = spaceMatch?.params.id;

  // Haptic feedback for mobile
  const vibrate = (pattern: number | number[]) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  const handleAddClick = () => {
    vibrate(10);

    if (isDuesPage) {
      // The dues page consumes this and opens its create sheet.
      navigate("/dues?add=due", { replace: true });
      return;
    }

    if (spaceId) {
      openCreate(spaceId, true);
      return;
    }

    openCreate();
  };

  const handleMoreClick = () => {
    vibrate(8);
    setMoreOpen(true);
  };

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center bg-linear-to-t from-background/60 via-background/20 to-transparent px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative flex w-full max-w-md items-center justify-around rounded-full border border-border/70 bg-card/90 px-1.5 py-1 backdrop-blur-xl shadow-[inset_0_1px_0_oklch(1_0_0/0.65),0_18px_40px_-16px_oklch(0.2_0.02_170/0.42)] dark:shadow-[inset_0_1px_0_oklch(1_0_0/0.06),0_18px_40px_-16px_oklch(0_0_0/0.8)]"
        >
          {NAV_ITEMS.map((item) => {
            if (item.type === "add") {
              return (
                <div key="add-button" className="flex flex-1 justify-center">
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    type="button"
                    onClick={handleAddClick}
                    aria-label={isDuesPage ? "Add due" : "Add transaction"}
                    className="relative flex size-14 items-center justify-center rounded-full border border-[color-mix(in_oklch,var(--primary),black_12%)] bg-[linear-gradient(180deg,var(--primary-top),var(--primary))] text-primary-foreground shadow-elev-primary transition-[box-shadow,background] hover:shadow-elev-primary-hover"
                  >
                    <Plus className="size-7 stroke-[2.5px]" />
                  </motion.button>
                </div>
              );
            }

            if (item.type === "more") {
              return (
                <motion.button
                  key="more-button"
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  type="button"
                  onClick={handleMoreClick}
                  aria-label={
                    overdueCount > 0
                      ? `More, ${overdueCount} overdue ${overdueCount === 1 ? "due" : "dues"}`
                      : "More"
                  }
                  aria-haspopup="dialog"
                  aria-expanded={moreOpen}
                  aria-current={isMoreActive ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-0.5 py-2 text-xs font-semibold transition-colors select-none touch-manipulation",
                    isMoreActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isMoreActive && (
                    <motion.div
                      layoutId="activeBottomNavPill"
                      className="absolute inset-0 -z-10 rounded-full border border-primary/10 bg-primary/10 shadow-[inset_0_1px_2px_oklch(0.2_0.02_170/0.06)]"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                        mass: 0.8,
                      }}
                    />
                  )}
                  <span className="relative flex flex-col items-center">
                    <span className="relative">
                      <Ellipsis
                        className={cn(
                          "size-5 transition-all duration-200",
                          isMoreActive && "scale-105 stroke-[2.5px]"
                        )}
                      />
                      {overdueCount > 0 && (
                        <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.6rem] font-bold text-white shadow-sm">
                          {overdueCount > 9 ? "9+" : overdueCount}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5">More</span>
                  </span>
                </motion.button>
              );
            }

            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-0.5 py-2 text-xs font-semibold transition-colors select-none touch-manipulation",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="activeBottomNavPill"
                        className="absolute inset-0 -z-10 rounded-full border border-primary/10 bg-primary/10 shadow-[inset_0_1px_2px_oklch(0.2_0.02_170/0.06)]"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                          mass: 0.8,
                        }}
                      />
                    )}
                    <motion.div
                      whileTap={{ scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="flex flex-col items-center"
                    >
                      <Icon
                        className={cn(
                          "size-5 transition-all duration-200",
                          isActive && "scale-105 stroke-[2.5px]"
                        )}
                      />
                      <span className="mt-0.5">{item.label}</span>
                    </motion.div>
                  </>
                )}
              </NavLink>
            );
          })}
        </motion.div>
      </nav>

      <Sheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        title="More"
        description="Settings, insights, and dues."
      >
        <Card padded={false} className="rounded-4xl p-1.5">
          {MORE_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const showDueBadge = item.to === "/dues" && overdueCount > 0;

            return (
              <div key={item.to}>
                {index > 0 && <div className="mx-4 my-1 h-px bg-border/60" />}
                <Link
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-3xl px-4 py-3.5 text-left transition-colors hover:bg-muted/50 active:scale-[0.99]"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="block text-xs font-medium text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                  {showDueBadge && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[0.65rem] font-bold text-white">
                      {overdueCount > 9 ? "9+" : overdueCount}
                    </span>
                  )}
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </div>
            );
          })}
        </Card>
      </Sheet>
    </>
  );
}

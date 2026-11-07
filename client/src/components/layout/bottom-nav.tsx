import { Link, matchPath, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChartNoAxesCombined,
  HandCoins,
  House,
  Layers,
  Plus,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTransactionForm } from "@/lib/transaction-form";
import { useDuesSummary } from "@/lib/queries";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
}

const isHomeSection = (pathname: string) =>
  pathname === "/" ||
  pathname.startsWith("/settings") ||
  pathname.startsWith("/profile");

const isSection = (prefix: string) => (pathname: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Home", icon: House, isActive: isHomeSection },
  {
    to: "/transactions",
    label: "Activity",
    icon: Wallet,
    isActive: isSection("/transactions"),
  },
  { to: "/dues", label: "Dues", icon: HandCoins, isActive: isSection("/dues") },
  { to: "/spaces", label: "Spaces", icon: Layers, isActive: isSection("/spaces") },
  {
    to: "/analytics",
    label: "Insights",
    icon: ChartNoAxesCombined,
    isActive: isSection("/analytics"),
  },
];

export function BottomNav() {
  const { openCreate } = useTransactionForm();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data: duesSummary } = useDuesSummary();

  const overdueCount = duesSummary?.overdueCount ?? 0;
  const isDuesPage = pathname === "/dues";
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

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center bg-linear-to-t from-background/60 via-background/20 to-transparent px-4 pb-4">
      <div className="absolute bottom-full left-1/2 mb-3 -translate-x-1/2">
        <motion.button
          initial={{ scale: 0.7, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", stiffness: 360, damping: 24 }}
          type="button"
          onClick={handleAddClick}
          aria-label={isDuesPage ? "Add due" : "Add transaction"}
          className="relative flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-colors hover:bg-primary/90"
        >
          {isDuesPage ? (
            <HandCoins className="size-6 stroke-[2.5px]" />
          ) : (
            <Plus className="size-7 stroke-[2.5px]" />
          )}
          <motion.span
            className="absolute inset-0 rounded-full bg-primary/20"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.6, 0, 0.6],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "loop",
              ease: "easeInOut",
            }}
          />
        </motion.button>
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative flex w-full max-w-md items-center justify-around rounded-full border border-border/50 bg-card/40 px-1.5 py-0.5 shadow-2xl backdrop-blur-2xl backdrop-saturate-180"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive(pathname);
          const showDuesBadge = item.to === "/dues" && overdueCount > 0;

          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={isActive ? "page" : undefined}
              aria-label={
                showDuesBadge
                  ? `${item.label}, ${overdueCount} overdue`
                  : undefined
              }
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-[0.55rem] font-semibold transition-colors select-none touch-manipulation",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeBottomNavPill"
                  className="absolute inset-0 -z-10 rounded-full bg-primary/10"
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
                className="relative flex flex-col items-center"
              >
                <Icon
                  className={cn(
                    "size-[1.15rem] transition-all duration-200",
                    isActive && "scale-105 stroke-[2.5px]"
                  )}
                />
                {showDuesBadge && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.5rem] font-bold text-white shadow-sm">
                    {overdueCount > 9 ? "9+" : overdueCount}
                  </span>
                )}
                <span className="mt-0.5">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </motion.div>
    </nav>
  );
}

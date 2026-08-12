import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  House,
  Wallet,
  ChartNoAxesCombined,
  FolderOpen,
  Plus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useTransactionForm } from "@/lib/transaction-form";

export function BottomNav() {
  const { openCreate } = useTransactionForm();

  const navItems = [
    { to: "/", label: "Home", icon: House, end: true },
    { to: "/transactions", label: "Activity", icon: Wallet, end: false },
    { type: "button" as const },
    { to: "/spaces", label: "Spaces", icon: FolderOpen, end: false },
    { to: "/analytics", label: "Insights", icon: ChartNoAxesCombined, end: false },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="relative flex w-full max-w-md items-center justify-around rounded-full border border-white/30 dark:border-white/10 bg-card/75 p-1.5 shadow-2xl backdrop-blur-2xl backdrop-saturate-180">
        {navItems.map((item) => {
          if (item.type === "button") {
            return (
              <div key="add-button" className="flex flex-1 justify-center">
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.92 }}
                  type="button"
                  onClick={() => openCreate()}
                  aria-label="Add transaction"
                  className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/35 transition-colors"
                >
                  <Plus className="size-6 stroke-[2.5px]" />
                </motion.button>
              </div>
            );
          }

          const Icon = item.icon!;

          return (
            <NavLink
              key={item.to}
              to={item.to!}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-1 flex-col items-center gap-1 py-1 text-[0.65rem] font-semibold transition-colors select-none",
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
                      className="absolute inset-0 rounded-full bg-primary/10 -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className={cn("size-5 transition-transform", isActive && "stroke-[2.5px] scale-105")} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

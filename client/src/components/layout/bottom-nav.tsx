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

  // Haptic feedback for mobile
  const vibrate = (pattern: number | number[]) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  const handleAddClick = () => {
    vibrate(10);
    openCreate();
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4  bg-linear-to-t from-background/60  via-background/20 to-transparent">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative flex w-full max-w-md items-center px-1.5 py-0.5  justify-around rounded-full border border-border/50 bg-card/40  shadow-2xl backdrop-blur-2xl backdrop-saturate-180"
      >
        {navItems.map((item) => {
          if (item.type === "button") {
            return (
              <div key="add-button" className="flex flex-1 justify-center">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  type="button"
                  onClick={handleAddClick}
                  aria-label="Add transaction"
                  className="relative flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-colors hover:bg-primary/90"
                >
                  <Plus className="size-7 stroke-[2.5px]" />
                  <motion.div
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
                  "relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[0.6rem] font-semibold transition-colors select-none rounded-full touch-manipulation",
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
                      transition={{ 
                        type: "spring", 
                        stiffness: 380, 
                        damping: 30,
                        mass: 0.8
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
                        isActive && "stroke-[2.5px] scale-105"
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
  );
}
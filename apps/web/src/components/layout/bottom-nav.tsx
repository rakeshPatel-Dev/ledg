import { NavLink } from "react-router-dom";
import {
  House,
  Wallet,
  ChartNoAxesCombined,
  FolderOpen,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useTransactionForm } from "@/lib/transaction-form";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: House, end: true },
  { to: "/transactions", label: "Activity", icon: Wallet, end: false },
  { to: "/spaces", label: "Spaces", icon: FolderOpen, end: false },
  { to: "/analytics", label: "Insights", icon: ChartNoAxesCombined, end: false },
  { to: "/settings", label: "You", icon: UserRound, end: false },
];

export function BottomNav() {
  const { openCreate } = useTransactionForm();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
      <div className="mx-auto grid max-w-md grid-cols-5 px-2 py-1.5">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 rounded-3xl py-2.5 text-[0.65rem] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    "size-5",
                    isActive && "fill-primary/15"
                  )}
                  strokeWidth={isActive ? 2.4 : 2}
                />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </div>

      <button
        type="button"
        onClick={() => openCreate()}
        aria-label="Add transaction"
        className="fixed bottom-20 right-4 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95 sm:right-1/2 sm:translate-x-[10rem]"
      >
        <span className="text-2xl font-light leading-none">+</span>
      </button>
    </nav>
  );
}

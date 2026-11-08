import { HandCoins } from "lucide-react";
import { Link } from "react-router-dom";

import { UserAvatar } from "@/components/common/user-avatar";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { useAuth } from "@/lib/auth-provider";
import { useDuesSummary } from "@/lib/queries";

export function Header() {
  const { user } = useAuth();
  const { data: duesSummary } = useDuesSummary();

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <header className="flex items-center justify-between">
      <Link
        to="/settings"
        className="group flex items-center gap-3 text-left transition-all active:scale-98"
      >
        <UserAvatar
          user={user}
          className="size-11 ring-2 ring-primary/30 transition-all group-hover:ring-primary shadow-xs"
          fallbackClassName="font-semibold bg-card/80 backdrop-blur-md"
        />
        <div className="leading-tight">
          <p className="text-xs font-medium text-muted-foreground">{greeting}</p>
          <p className="font-semibold text-foreground transition-all group-hover:text-primary">
            {user?.username ? `@${user.username}` : firstName}
          </p>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        <Link
          to="/dues"
          aria-label="Dues and loans"
          className="relative flex min-h-11 items-center gap-1.5 rounded-full border border-[color-mix(in_oklch,var(--primary),black_10%)] bg-[linear-gradient(180deg,var(--primary-top),var(--primary))] px-3.5 py-2.5 text-primary-foreground shadow-elev-primary transition-[box-shadow,background,transform] duration-200 hover:shadow-elev-primary-hover active:shadow-elev-pressed active:scale-95"
        >
          <HandCoins className="size-4" />
          <span className="text-xs font-bold">Dues</span>
          {duesSummary && duesSummary.overdueCount > 0 && (
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[0.55rem] font-bold text-white shadow-sm">
              {duesSummary.overdueCount}
            </span>
          )}
        </Link>

        <NotificationCenter />
      </div>
    </header>
  );
}

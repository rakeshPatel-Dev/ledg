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
          className="relative flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2.5 text-primary-foreground shadow-md shadow-primary/30 transition-all hover:bg-primary/90 active:scale-95"
        >
          <HandCoins className="size-4" />
          <span className="text-xs font-bold">Dues</span>
          {duesSummary && duesSummary.overdueCount > 0 && (
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[0.55rem] font-bold text-white shadow-sm animate-pulse">
              {duesSummary.overdueCount}
            </span>
          )}
        </Link>

        <NotificationCenter />
      </div>

    </header>
  );
}
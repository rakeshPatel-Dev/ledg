import { Bell, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { UserAvatar } from "@/components/common/user-avatar";
import { useAuth } from "@/lib/auth-provider";

export function Header() {
  const { user } = useAuth();

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

      <button
        type="button"
        aria-label="Notifications"
        onClick={() =>
          toast.info("All caught up!", {
            description: "You have no unread expense alerts or notifications.",
            icon: <Sparkles className="size-4 text-primary" />,
          })
        }
        className="relative flex size-11 items-center justify-center rounded-full bg-card/80 backdrop-blur-md text-muted-foreground shadow-xs transition-all hover:bg-card hover:text-foreground active:scale-95 border border-white/20 dark:border-white/10"
      >
        <Bell className="size-5" />
      </button>
    </header>
  );
}
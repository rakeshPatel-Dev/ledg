import { Bell, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
        <Avatar className="size-11 ring-2 ring-primary/30 transition-all group-hover:ring-primary shadow-xs">
          <AvatarImage src={user?.image ?? ""} alt={firstName} />
          <AvatarFallback className="font-semibold bg-card/80 backdrop-blur-md">
            {firstName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="leading-tight">
          <p className="text-xs font-medium text-muted-foreground">{greeting}</p>
          <p className="text-base font-bold tracking-tight capitalize text-foreground group-hover:text-primary transition-colors">
            {firstName}
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
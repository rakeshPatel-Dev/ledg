import { useUser } from "@clerk/react";
import { Bell } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Header() {
  const { user } = useUser();

  const firstName = user?.firstName ?? user?.username ?? "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Avatar className="size-11">
          <AvatarImage src={user?.imageUrl} alt={firstName} />
          <AvatarFallback>
            {firstName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="leading-tight">
          <p className="text-xs text-muted-foreground">{greeting}</p>
          <p className="text-base font-bold tracking-tight capitalize">
            {firstName}
          </p>
        </div>
      </div>


      <button
        type="button"
        aria-label="Notifications"
        className="relative flex size-11 items-center justify-center rounded-full bg-card text-muted-foreground shadow-xs transition-colors hover:text-foreground"
      >
        <Bell className="size-5" />
        <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-destructive" />
      </button>
    </header>
  );
}

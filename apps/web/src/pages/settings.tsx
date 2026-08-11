import { useUser, useClerk } from "@clerk/react";
import { LogOut, Moon, CircleDollarSign, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const name = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
    : user?.username ?? "Ledg user";

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold tracking-tight">You</h1>

      <Card className="flex items-center gap-4 rounded-4xl p-5">
        <Avatar className="size-16">
          <AvatarImage src={user?.imageUrl} alt={name} />
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold tracking-tight">{name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {user?.primaryEmailAddress?.emailAddress}
          </p>
        </div>
      </Card>

      <div className="flex flex-col gap-2">
        <Card className="rounded-4xl p-1.5">
          <button
          disabled
            type="button"
            className="flex w-full items-center gap-3 rounded-3xl px-4 py-3.5 text-left transition-colors hover:bg-muted/40"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <CircleDollarSign className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-medium">Currency</span>
              <span className="block text-xs text-muted-foreground">
                Indian Rupee (INR)
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>

          <button
            disabled
            type="button"
            className="flex w-full items-center gap-3 rounded-3xl px-4 py-3.5 text-left transition-colors hover:bg-muted/40"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <Moon className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-medium">Appearance</span>
              <span className="block text-xs text-muted-foreground">
                Theme settings coming soon
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        </Card>
      </div>

      <Button
        variant="outline"
        className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={async () => {
          await signOut();
          navigate("/sign-in");
        }}
      >
        <LogOut className="size-4" />
        Sign out
      </Button>
    </div>
  );
}

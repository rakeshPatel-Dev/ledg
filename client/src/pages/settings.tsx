import { useState } from "react";
import { useUser, useClerk } from "@clerk/react";
import { LogOut, Moon, Sun, Monitor, CircleDollarSign, ChevronRight, UserCheck, ShieldCheck, FileText, Trash2, Sparkles } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { RequestFeatureForm } from "@/components/features/request-feature-form";
import { useTheme } from "@/lib/theme-provider";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const [requestSheetOpen, setRequestSheetOpen] = useState(false);

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

  const themeLabels = {
    light: "Light Mode",
    dark: "Dark Mode",
    system: "System Default",
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold tracking-tight">You</h1>

      {/* User Profile Card */}
      <Card
        onClick={() => openUserProfile?.()}
        className="flex cursor-pointer items-center justify-between gap-4 rounded-4xl p-5 transition-all hover:bg-card/80 active:scale-[0.99]"
      >
        <div className="flex items-center gap-4 min-w-0">
          <Avatar className="size-16 ring-2 ring-primary/20">
            <AvatarImage src={user?.imageUrl} alt={name} />
            <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold tracking-tight">{name}</p>
            <p className="truncate text-xs font-medium text-muted-foreground">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[0.65rem] font-semibold text-primary">
              <UserCheck className="size-3" /> Managed with Clerk
            </span>
          </div>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      </Card>

      {/* Preferences Section */}
      <div className="flex flex-col gap-2">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Preferences
        </h2>
        <Card className="rounded-4xl p-1.5">
          <button
            type="button"
            onClick={() => setThemeSheetOpen(true)}
            className="flex w-full items-center gap-3 rounded-3xl px-4 py-3.5 text-left transition-colors hover:bg-muted/50 active:scale-[0.99]"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {theme === "dark" ? (
                <Moon className="size-5" />
              ) : theme === "light" ? (
                <Sun className="size-5" />
              ) : (
                <Monitor className="size-5" />
              )}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">Appearance</span>
              <span className="block text-xs font-medium text-muted-foreground capitalize">
                {themeLabels[theme]}
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>

          <div className="mx-4 my-1 h-px bg-border/60" />

          <button
            disabled
            type="button"
            className="flex w-full items-center gap-3 rounded-3xl px-4 py-3.5 text-left opacity-75"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CircleDollarSign className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">Default Currency</span>
              <span className="block text-xs font-medium text-muted-foreground">
                Nepalese Rupee (NPR)
              </span>
            </span>
            <span className="text-[0.65rem] font-semibold text-muted-foreground">Auto</span>
          </button>
        </Card>
      </div>

      {/* Feedback & Requests Section */}
      <div className="flex flex-col gap-2">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Feedback & Requests
        </h2>
        <Card className="rounded-4xl p-1.5">
          <button
            type="button"
            onClick={() => setRequestSheetOpen(true)}
            className="flex w-full items-center gap-3 rounded-3xl px-4 py-3.5 text-left transition-colors hover:bg-muted/50 active:scale-[0.99]"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">Request a Feature</span>
              <span className="block text-xs font-medium text-muted-foreground">
                Suggest an idea or report an issue
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        </Card>
      </div>

      {/* Legal Section */}
      <div className="flex flex-col gap-2">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Legal
        </h2>
        <Card className="rounded-4xl p-1.5">
          {[
            { to: "/privacy", label: "Privacy Policy", icon: ShieldCheck },
            { to: "/terms", label: "Terms of Service", icon: FileText },
            { to: "/data-deletion", label: "Delete My Data", icon: Trash2 },
          ].map((item, i) => (
            <div key={item.to}>
              {i > 0 && <div className="mx-4 my-1 h-px bg-border/60" />}
              <Link
                to={item.to}
                className="flex w-full items-center gap-3 rounded-3xl px-4 py-3.5 text-left transition-colors hover:bg-muted/50 active:scale-[0.99]"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <item.icon className="size-5" />
                </span>
                <span className="flex-1 text-sm font-semibold">{item.label}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </div>
          ))}
        </Card>
      </div>

      {/* Sign Out Action */}
      <Button
        variant="outline"
        size="lg"
        className="w-full rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive active:scale-[0.98]"
        onClick={async () => {
          await signOut();
          navigate("/welcome");
        }}
      >
        <LogOut className="size-4 mr-2" />
        Sign out
      </Button>

      {/* Request Feature Sheet */}
      <Sheet
        open={requestSheetOpen}
        onOpenChange={setRequestSheetOpen}
        title="Request a Feature"
        description="Suggest an idea or report an issue. We read every request."
      >
        <RequestFeatureForm />
      </Sheet>

      {/* Theme Picker Sheet */}
      <Sheet
        open={themeSheetOpen}
        onOpenChange={setThemeSheetOpen}
        title="Choose Theme"
        description="Select your preferred display appearance."
      >
        <div className="grid gap-3 pt-2">
          {(["light", "dark", "system"] as const).map((t) => {
            const Icon = t === "dark" ? Moon : t === "light" ? Sun : Monitor;
            const active = theme === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTheme(t);
                  setThemeSheetOpen(false);
                }}
                className={cn(
                  "flex items-center gap-4 rounded-3xl p-4 text-left font-semibold transition-all border",
                  active
                    ? "border-primary bg-primary/10 text-primary shadow-xs"
                    : "border-border/60 bg-card text-foreground hover:bg-muted/50"
                )}
              >
                <span className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-2xl",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="size-5" />
                </span>
                <span className="flex-1 text-sm">{themeLabels[t]}</span>
                {active && <span className="size-2 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </Sheet>
    </div>
  );
}


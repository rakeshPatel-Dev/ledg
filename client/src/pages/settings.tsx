import { useState } from "react";
import { LogOut, Moon, Sun, Monitor, CircleDollarSign, ChevronRight, UserCheck, ShieldCheck, FileText, Trash2, Sparkles, Activity, Waves, Loader2, UserRound } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { RequestFeatureForm } from "@/components/features/request-feature-form";
import { useTheme } from "@/lib/theme-provider";
import { useMotion } from "@/lib/animation-provider";
import { useAuth } from "@/lib/auth-provider";
import { authClient } from "@/lib/auth-client";
import { getApi } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user, signOut, refetch } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { motion, setMotion } = useMotion();

  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const [requestSheetOpen, setRequestSheetOpen] = useState(false);
  const [motionSheetOpen, setMotionSheetOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const openProfileSheet = () => {
    setProfileName(user?.name ?? "");
    setProfileEmail(user?.email ?? "");
    setProfileSheetOpen(true);
  };

  const openDeleteSheet = () => {
    setDeleteConfirmation("");
    setDeleteError("");
    setDeleteSheetOpen(true);
  };

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const name = profileName.trim();
      const email = profileEmail.trim().toLowerCase();
      const nameChanged = name !== user.name;
      const emailChanged = email !== user.email.toLowerCase();

      if (!nameChanged && !emailChanged) {
        toast.success("Your profile is already up to date");
        setProfileSheetOpen(false);
        return;
      }

      if (nameChanged) {
        const { error } = await authClient.updateUser({ name });
        if (error) {
          toast.error(error.message ?? "Could not update your name");
          return;
        }
      }

      if (emailChanged) {
        try {
          await getApi().me.updateEmail(email);
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not update your email"
          );
          return;
        }
      }

      await refetch();
      toast.success("Profile updated");
      setProfileSheetOpen(false);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const deleteAccount = async () => {
    if (!user || deleteConfirmation.trim() !== user.name) return;
    setDeletingAccount(true);
    setDeleteError("");
    try {
      const { error } = await authClient.deleteUser();
      if (error) {
        setDeleteError(error.message ?? "Could not delete your account");
        return;
      }
      await refetch();
      setDeleteSheetOpen(false);
      navigate("/welcome");
      toast.success("Your account has been deleted");
    } catch {
      setDeleteError("Something went wrong. Please try again.");
    } finally {
      setDeletingAccount(false);
    }
  };

  const name = user?.name || "Ledg user";

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

  const motionLabels = {
    full: "Full Motion",
    reduced: "Reduced Motion",
    system: "System Default",
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold tracking-tight">You</h1>

      {/* User Profile Card */}
      <Card className="flex items-center justify-between gap-4 border-0 rounded-4xl p-5">
        <div className="flex items-center gap-4 min-w-0">
          <Avatar className="size-16 ring-2 ring-primary/20">
            <AvatarImage src={user?.image ?? ""} alt={name} />
            <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold tracking-tight">{name}</p>
            <p className="truncate text-xs font-medium text-muted-foreground">
              {user?.email}
            </p>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[0.65rem] font-semibold text-primary">
              <UserCheck className="size-3" /> Signed in
            </span>
          </div>
        </div>
      </Card>

      {/* Account Section */}
      <div className="flex flex-col gap-2">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Account
        </h2>
        <Card className="rounded-4xl p-1.5">
          <button
            type="button"
            onClick={openProfileSheet}
            className="flex w-full items-center gap-3 rounded-3xl px-4 py-3.5 text-left transition-colors hover:bg-muted/50 active:scale-[0.99]"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserRound className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">Edit Profile</span>
              <span className="block text-xs font-medium text-muted-foreground">
                Update your name and email
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>

          <div className="mx-4 my-1 h-px bg-border/60" />

          <button
            type="button"
            onClick={openDeleteSheet}
            className="flex w-full items-center gap-3 rounded-3xl px-4 py-3.5 text-left transition-colors hover:bg-destructive/5 active:scale-[0.99]"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <Trash2 className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-destructive">
                Delete Account
              </span>
              <span className="block text-xs font-medium text-muted-foreground">
                Permanently erase your account and all data
              </span>
            </span>
            <ChevronRight className="size-4 text-destructive" />
          </button>
        </Card>
      </div>

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

          <div className="mx-4 my-1 h-px bg-border/60" />

          <button
            type="button"
            onClick={() => setMotionSheetOpen(true)}
            className="flex w-full items-center gap-3 rounded-3xl px-4 py-3.5 text-left transition-colors hover:bg-muted/50 active:scale-[0.99]"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Activity className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">Motion</span>
              <span className="block text-xs font-medium text-muted-foreground capitalize">
                {motionLabels[motion]}
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
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
            {
              to: "/privacy",
              label: "Privacy Policy",
              description: "Learn how we handle the data",
              icon: ShieldCheck,
            },
            {
              to: "/terms",
              label: "Terms of Service",
              description: "Understand your rights and obligations",
              icon: FileText,
            },
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
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="block text-xs font-medium text-muted-foreground">
                    {item.description}
                  </span>
                </span>
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
        disabled={signingOut}
        onClick={async () => {
          setSigningOut(true);
          try {
            await signOut();
            navigate("/welcome");
          } finally {
            setSigningOut(false);
          }
        }}
      >
        {signingOut ? (
          <>
            <Loader2 className="size-4 mr-2 animate-spin" />
            Signing out…
          </>
        ) : (
          <>
            <LogOut className="size-4 mr-2" />
            Sign out
          </>
        )}
      </Button>

      {/* Request Feature Sheet */}
      <Sheet
        open={requestSheetOpen}
        onOpenChange={setRequestSheetOpen}
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

      {/* Motion Picker Sheet */}
      <Sheet
        open={motionSheetOpen}
        onOpenChange={setMotionSheetOpen}
        title="Choose Motion"
        description="Control how animated the app feels."
      >
        <div className="grid gap-3 pt-2">
          {(["full", "reduced", "system"] as const).map((m) => {
            const Icon = m === "full" ? Activity : m === "reduced" ? Waves : Monitor;
            const active = motion === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMotion(m);
                  setMotionSheetOpen(false);
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
                <span className="flex-1 text-sm">{motionLabels[m]}</span>
                {active && <span className="size-2 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </Sheet>

      {/* Edit Profile Sheet */}
      <Sheet
        open={profileSheetOpen}
        onOpenChange={setProfileSheetOpen}
        title="Edit Profile"
        description="Update the name and email on your account."
      >
        <div className="grid gap-3 pt-2">
          <div className="space-y-1.5">
            <label
              htmlFor="profile-name"
              className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Name
            </label>
            <Input
              id="profile-name"
              type="text"
              autoComplete="name"
              placeholder="John Doe"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="profile-email"
              className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Email
            </label>
            <Input
              id="profile-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={profileEmail}
              onChange={(e) => setProfileEmail(e.target.value)}
            />
          </div>
          <Button
            size="lg"
            disabled={savingProfile || !profileName.trim() || !profileEmail.trim()}
            onClick={saveProfile}
            className="mt-1 w-full"
          >
            {savingProfile ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </Sheet>

      {/* Delete Account Sheet */}
      <Sheet
        open={deleteSheetOpen}
        onOpenChange={setDeleteSheetOpen}
        title="Delete Account"
        description="This action cannot be undone."
      >
        <div className="grid gap-3 pt-2">
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3.5 text-xs font-medium text-destructive">
            Your account, along with all your spaces and transactions, will be
            permanently deleted.
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="delete-confirm"
              className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Type <span className="font-bold text-foreground">{user?.name}</span> to confirm
            </label>
            <Input
              id="delete-confirm"
              type="text"
              autoComplete="off"
              placeholder={user?.name}
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
            />
          </div>
          {deleteError && (
            <p className="text-xs font-medium text-destructive">{deleteError}</p>
          )}
          <Button
            size="lg"
            variant="destructive-solid"
            disabled={
              deletingAccount || !user?.name || deleteConfirmation.trim().toLowerCase() !== user.name.trim().toLowerCase()
            }
            onClick={deleteAccount}
            className="w-full"
          >
            {deletingAccount ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Permanently delete my account"
            )}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}


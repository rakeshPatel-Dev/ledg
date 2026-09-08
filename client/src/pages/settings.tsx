import { useState, useEffect } from "react";
import {
  LogOut,
  Moon,
  Sun,
  Monitor,
  ChevronRight,
  ShieldCheck,
  FileText,
  Sparkles,
  Activity,
  Waves,
  Loader2,
  Download,
  Database,
  Bell,
  Check,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/common/user-avatar";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Segmented } from "@/components/ui/segmented";
import { RequestFeatureForm } from "@/components/features/request-feature-form";
import { useTheme } from "@/lib/theme-provider";
import { useMotion } from "@/lib/animation-provider";
import { useAuth } from "@/lib/auth-provider";
import {
  useAllData,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/lib/queries";
import { exportTransactionsToCSV, exportTransactionsToJSON } from "@/lib/export";
import { getApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { TransactionActivityMode } from "@ledg/shared";


export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { spaces, transactions, loading: dataLoading } = useAllData();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { motion, setMotion } = useMotion();

  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const [requestSheetOpen, setRequestSheetOpen] = useState(false);
  const [motionSheetOpen, setMotionSheetOpen] = useState(false);
  const [notifSheetOpen, setNotifSheetOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [userProfile, setUserProfile] = useState<{
    name: string;
    username: string | null;
    email: string;
    image: string | null;
    provider: string;
    joinedAt?: string;
  } | null>(null);
  const [authProvider, setAuthProvider] = useState<string | null>(null);

  useEffect(() => {
    getApi().me.getProfile().then((data) => {
      setUserProfile(data);
      setAuthProvider(data.provider);
    }).catch(() => null);
  }, []);

  const name = user?.name || "Ledg user";

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

   const {
    data: notifPrefs,
    isLoading: loadingNotifPrefs,
    isError: notifPrefsError,
  } = useNotificationPreferences();
  const updateNotifPrefsMutation = useUpdateNotificationPreferences();

  const notifActivityModeOptions: { value: TransactionActivityMode; label: string }[] = [
    { value: "realtime", label: "Realtime" },
    { value: "daily_digest", label: "Daily Digest" },
    { value: "off", label: "Off" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold tracking-tight">You</h1>

      {/* User Profile Card */}
      <Link to="/profile" className="block group">
        <Card className="flex items-center justify-between gap-4 border border-border/60 rounded-4xl p-5 transition-all group-hover:bg-muted/40 active:scale-[0.99] cursor-pointer">
          <div className="flex items-center gap-4 min-w-0">
            <UserAvatar
              user={user}
              className="size-16 ring-2 ring-primary/20 transition-all group-hover:ring-primary/40"
              fallbackClassName="text-lg font-semibold"
            />
            <div className="min-w-0">
              <p className="truncate text-lg font-bold tracking-tight group-hover:text-primary transition-colors">
                {name}
              </p>
              {(user?.username || userProfile?.username) && (
                <p className="text-xs font-semibold text-primary">
                  @{user?.username || userProfile?.username}
                </p>
              )}
               {authProvider && (
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[0.65rem] font-semibold text-primary capitalize">
                    {authProvider === "google" ? "Google OAuth" : "Email & Password"}
                  </span>
                </div>
              )}
            </div>
          </div>
          <ChevronRight className="size-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        </Card>
      </Link>

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

          <div className="mx-4 my-1 h-px bg-border/60" />

          <button
            type="button"
            onClick={() => setNotifSheetOpen(true)}
            className="flex w-full items-center gap-3 rounded-3xl px-4 py-3.5 text-left transition-colors hover:bg-muted/50 active:scale-[0.99]"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bell className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">Notifications</span>
              <span className="block text-xs font-medium text-muted-foreground">
                {notifPrefs
                  ? notifPrefs.inviteEvents
                    ? "Invite alerts on"
                    : "Invite alerts off"
                  : "Configure alerts"}
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

      {/* Data & Backup Section */}
      <div className="flex flex-col gap-2">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Data & Backup
        </h2>
        <Card className="rounded-4xl p-1.5">
          <button
            type="button"
            disabled={dataLoading}
            onClick={() => {
              exportTransactionsToCSV(transactions, spaces, "ledg-transactions.csv");
              toast.success(`Exported ${transactions.length} transactions to CSV`);
            }}
            className="flex w-full items-center gap-3 rounded-3xl px-4 py-3.5 text-left transition-colors hover:bg-muted/50 active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Download className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">Export Transactions (CSV)</span>
              <span className="block text-xs font-medium text-muted-foreground">
                Download spreadsheet with all transaction records
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>

          <div className="mx-4 my-1 h-px bg-border/60" />

          <button
            type="button"
            disabled={dataLoading}
            onClick={() => {
              exportTransactionsToJSON(transactions, spaces, "ledg-backup.json");
              toast.success("Full backup file downloaded");
            }}
            className="flex w-full items-center gap-3 rounded-3xl px-4 py-3.5 text-left transition-colors hover:bg-muted/50 active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Database className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">Full Data Backup (JSON)</span>
              <span className="block text-xs font-medium text-muted-foreground">
                Export spaces and transactions for backup
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

      {/* Sign Out */}
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
      <Sheet open={requestSheetOpen} onOpenChange={setRequestSheetOpen}>
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
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-2xl",
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
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
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-2xl",
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span className="flex-1 text-sm">{motionLabels[m]}</span>
                {active && <span className="size-2 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </Sheet>

      {/* Notification Preferences Sheet */}
      <Sheet
        open={notifSheetOpen}
        onOpenChange={setNotifSheetOpen}
        title="Notification Preferences"
        description="Control which events send you in-app alerts."
      >
        <div className="flex flex-col gap-5 pt-2">
          {loadingNotifPrefs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifPrefsError || !notifPrefs ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8">
              <p className="text-sm font-semibold text-destructive">Failed to load preferences</p>
              <p className="text-xs text-muted-foreground">
                Please try again later or refresh the page.
              </p>
            </div>
          ) : (
            <>
              {/* Invite Events Toggle */}
              <div className="flex items-center justify-between rounded-2xl bg-muted/40 p-4 border border-border/40">
                <div>
                  <p className="text-sm font-semibold">Invitation Alerts</p>
                  <p className="text-xs text-muted-foreground">
                    Notify me when I receive a space invitation
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateNotifPrefsMutation.mutate({
                      inviteEvents: !notifPrefs.inviteEvents,
                    })
                  }
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    notifPrefs.inviteEvents ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
                      notifPrefs.inviteEvents ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              {/* Member Changes Toggle */}
              <div className="flex items-center justify-between rounded-2xl bg-muted/40 p-4 border border-border/40">
                <div>
                  <p className="text-sm font-semibold">Member Changes</p>
                  <p className="text-xs text-muted-foreground">
                    Notify me when members join or leave my spaces
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateNotifPrefsMutation.mutate({
                      memberChanges: !notifPrefs.memberChanges,
                    })
                  }
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    notifPrefs.memberChanges ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
                      notifPrefs.memberChanges ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              {/* Transaction Activity Mode */}
              <div className="flex flex-col gap-2 rounded-2xl bg-muted/40 p-4 border border-border/40">
                <div>
                  <p className="text-sm font-semibold">Transaction Alerts</p>
                  <p className="text-xs text-muted-foreground">
                    How to notify you of transaction activity in shared spaces
                  </p>
                </div>
                <Segmented
                  options={notifActivityModeOptions}
                  value={notifPrefs.transactionActivity ?? "realtime"}
                  onChange={(val) =>
                    updateNotifPrefsMutation.mutate({
                      transactionActivity: val as TransactionActivityMode,
                    })
                  }
                />
                <p className="text-[11px] text-muted-foreground/70">
                  Applies to new and edited transactions. Space deletion alerts
                  are always sent regardless of these settings.
                </p>
              </div>

              {updateNotifPrefsMutation.isSuccess && (
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-500">
                  <Check className="size-4" />
                  Preferences saved
                </div>
              )}
            </>
          )}
        </div>
      </Sheet>
    </div>

  );
}

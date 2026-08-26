import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Check,
  X,
  UserRound,
  Lock,
  Trash2,
  Calendar,
  Shield,
  KeyRound,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/common/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/ui/password-strength";
import { Sheet } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-provider";
import { authClient } from "@/lib/auth-client";
import { getApi } from "@/lib/api";
import { FadeInStagger, FadeInItem } from "@/components/common/page-transition";
import { useUsernameCheck } from "@/hooks/use-username-check";

export default function ProfilePage() {
  const { user, refetch } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<{
    name: string;
    username: string | null;
    email: string;
    image: string | null;
    provider: string;
    joinedAt?: string;
  } | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Username check — debounced, abort-safe
  const {
    status: usernameStatus,
    reason: usernameReason,
    check: checkUsername,
    reset: resetUsernameCheck,
  } = useUsernameCheck({ currentUsername: profileData?.username });

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Sheet states
  const [personalInfoOpen, setPersonalInfoOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await getApi().me.getProfile();
      setProfileData(data);
      setName(data.name || user?.name || "");
      setUsername(data.username || "");
      setEmail(data.email || user?.email || "");
      resetUsernameCheck();
    } catch {
      toast.error("Failed to load profile details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(val);
    checkUsername(val);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (usernameStatus === "taken" || usernameStatus === "invalid") {
      toast.error("Please choose a valid and available username");
      return;
    }

    setSavingProfile(true);
    try {
      const trimmedName = name.trim();
      const trimmedUsername = username.trim().toLowerCase();
      const trimmedEmail = email.trim().toLowerCase();

      const nameChanged = trimmedName !== (profileData?.name ?? user.name);
      const usernameChanged = trimmedUsername !== (profileData?.username ?? "");
      const emailChanged =
        trimmedEmail !== (profileData?.email ?? user.email).toLowerCase();

      if (!nameChanged && !usernameChanged && !emailChanged) {
        toast.success("Profile is already up to date");
        return;
      }

      // Single write path for name + username: /me/profile synchronizes both
      // the domain user record and Better Auth on the server.
      if (nameChanged || usernameChanged) {
        try {
          await getApi().me.updateProfile({
            name: nameChanged ? trimmedName : undefined,
            username: usernameChanged ? trimmedUsername : undefined,
          });
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Could not update profile"
          );
          return;
        }
      }

      if (emailChanged) {
        try {
          await getApi().me.updateEmail(trimmedEmail);
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Could not update email"
          );
          return;
        }
      }

      toast.success("Profile updated successfully");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSavingProfile(false);
      // Always reflect the server state before the next save, even after a
      // partial failure or early return.
      await Promise.allSettled([refetch(), loadProfile()]);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || newPassword.length < 8) return;
    setSavingPassword(true);
    setPasswordError("");
    try {
      await getApi().me.changePassword(currentPassword, newPassword);
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not change password";
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !user ||
      deleteConfirmation.trim().toLowerCase() !== user.name.trim().toLowerCase()
    )
      return;
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

  const displayName = profileData?.name || user?.name || "User";

  const isGoogle = profileData?.provider === "google";
  const isCredential = profileData?.provider === "credential";

  return (
    <div className="mx-auto max-w-md px-1 py-2">
      <FadeInStagger className="flex flex-col gap-5">
        {/* Header Navigation */}
        <FadeInItem>
          <div className="flex items-center justify-between pt-1">
            <Link
              to="/settings"
              className="inline-flex size-10 items-center justify-center rounded-full bg-secondary/80 text-foreground transition-all hover:bg-secondary active:scale-95 border border-white/20 dark:border-white/10"
              aria-label="Back to settings"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <h1 className="text-xl font-extrabold tracking-tight">Profile</h1>
            <div className="size-10" aria-hidden="true" />
          </div>
        </FadeInItem>

        {/* Hero Profile Card */}
        <FadeInItem>
          <Card className="flex flex-col items-center text-center gap-3 border-0 rounded-4xl p-6 relative overflow-hidden bg-gradient-to-b from-card to-muted/30">
            <UserAvatar
              user={{ name: displayName, image: profileData?.image ?? user?.image }}
              className="size-20 ring-4 ring-primary/20 shadow-md"
              fallbackClassName="text-2xl font-bold bg-card"
            />
            <div className="min-w-0 space-y-1">
              <p className="truncate text-xl font-extrabold tracking-tight">
                {displayName}
              </p>
              {profileData?.username && (
                <p className="text-sm font-bold text-primary">
                  @{profileData.username}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {profileData?.email || user?.email}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 flex-wrap justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary capitalize">
                <Shield className="size-3.5" />
                {isGoogle ? "Google Account" : "Password Protected"}
              </span>
              {profileData?.joinedAt && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Calendar className="size-3.5" />
                  Joined{" "}
                  {new Date(profileData.joinedAt).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
          </Card>
        </FadeInItem>

        {/* Personal Information */}
        <FadeInItem>
          <button
            type="button"
            onClick={() => setPersonalInfoOpen(true)}
            className="flex items-center gap-3 w-full rounded-4xl border border-border/60 bg-card p-4 transition-all hover:bg-muted/40 active:scale-[0.99] text-left"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserRound className="size-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Personal Information</p>
              <p className="text-xs text-muted-foreground">Name, username & email</p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          </button>
        </FadeInItem>

        {/* Security / Change Password (Only for Email/Password users) */}
        {isCredential && (
          <FadeInItem>
            <button
              type="button"
              onClick={() => setSecurityOpen(true)}
              className="flex items-center gap-3 w-full rounded-4xl border border-border/60 bg-card p-4 transition-all hover:bg-muted/40 active:scale-[0.99] text-left"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Lock className="size-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Security & Password</p>
                <p className="text-xs text-muted-foreground">Change your password</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            </button>
          </FadeInItem>
        )}

        {/* Danger Zone */}
        <FadeInItem>
          <div className="flex flex-col gap-2">
            <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-destructive flex items-center gap-1.5">
              <Trash2 className="size-3.5" /> Danger Zone
            </h2>
            <Card className="rounded-4xl p-5 border-destructive/20 bg-destructive/5 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-destructive">
                  Delete Account
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently delete your account, spaces, and all associated
                  records. This action is irreversible.
                </p>
              </div>
              <Button
                type="button"
                variant="destructive-solid"
                onClick={() => {
                  setDeleteConfirmation("");
                  setDeleteError("");
                  setDeleteSheetOpen(true);
                }}
                className="w-full rounded-full"
              >
                <Trash2 className="size-4 mr-2" />
                Delete My Account
              </Button>
            </Card>
          </div>
        </FadeInItem>
      </FadeInStagger>

      {/* Personal Information Sheet */}
      <Sheet
        open={personalInfoOpen}
        onOpenChange={setPersonalInfoOpen}
        title="Personal Information"
        description="Update your name, username and email."
      >
        <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Full Name
            </label>
            <Input
              id="name"
              type="text"
              required
              autoComplete="name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="username"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Username
              </label>
              <span className="text-[10px] text-muted-foreground">
                {username.length}/30
              </span>
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-sm font-semibold text-muted-foreground select-none">
                @
              </span>
              <Input
                id="username"
                type="text"
                required
                autoComplete="username"
                placeholder="johndoe"
                value={username}
                onChange={handleUsernameChange}
                maxLength={30}
                className="pl-8 pr-10"
              />
              <div className="absolute right-3 flex items-center">
                {usernameStatus === "checking" && (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                )}
                {usernameStatus === "available" && (
                  <Check className="size-4 text-emerald-500" />
                )}
                {(usernameStatus === "taken" ||
                  usernameStatus === "invalid") && (
                  <X className="size-4 text-destructive" />
                )}
              </div>
            </div>
            {usernameStatus === "available" && (
              <p className="text-[11px] font-medium text-emerald-500">
                @{username} is available!
              </p>
            )}
            {usernameStatus === "taken" && (
              <p className="text-[11px] font-medium text-destructive">
                @{username} is already taken
              </p>
            )}
            {usernameStatus === "invalid" && usernameReason && (
              <p className="text-[11px] font-medium text-destructive">
                {usernameReason}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={
              savingProfile ||
              loading ||
              !name.trim() ||
              !username.trim() ||
              !email.trim() ||
              usernameStatus === "taken" ||
              usernameStatus === "invalid"
            }
            className="w-full rounded-full"
          >
            {savingProfile ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Saving changes…
              </>
            ) : (
              <>
                <Check className="size-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </form>
      </Sheet>

      {/* Security & Password Sheet */}
      {isCredential && (
        <Sheet
          open={securityOpen}
          onOpenChange={setSecurityOpen}
          title="Security & Password"
          description="Update your account password."
        >
          <form onSubmit={handlePasswordChange} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label
                htmlFor="current-pw"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Current Password
              </label>
              <PasswordInput
                id="current-pw"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="new-pw"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                New Password
              </label>
              <PasswordInput
                id="new-pw"
                minLength={8}
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <PasswordStrength password={newPassword} />
            </div>

            {passwordError && (
              <p className="text-xs font-medium text-destructive">
                {passwordError}
              </p>
            )}

            <Button
              type="submit"
              variant="outline"
              size="lg"
              disabled={
                savingPassword ||
                !currentPassword ||
                newPassword.length < 8
              }
              className="w-full rounded-full"
            >
              {savingPassword ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Updating password…
                </>
              ) : (
                <>
                  <KeyRound className="size-4 mr-2" />
                  Change Password
                </>
              )}
            </Button>
          </form>
        </Sheet>
      )}

      {/* Delete Confirmation Sheet */}
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
              Type{" "}
              <span className="font-bold text-foreground">{user?.name}</span> to
              confirm
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
              deletingAccount ||
              !user?.name ||
              deleteConfirmation.trim().toLowerCase() !==
                user.name.trim().toLowerCase()
            }
            onClick={handleDeleteAccount}
            className="w-full rounded-full"
          >
            {deletingAccount ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="size-4 mr-2" />
                Permanently delete my account
              </>
            )}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

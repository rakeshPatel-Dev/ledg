import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Mail, RotateCcw, Check, UserPlus, X } from "lucide-react";

import AppLogo from "@/components/common/app-logo";
import { GoogleIcon } from "@/components/common/google-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  PasswordStrength,
  passwordRuleError,
} from "@/components/ui/password-strength";
import { authClient } from "@/lib/auth-client";
import { getApi } from "@/lib/api";
import { useUsernameCheck } from "@/hooks/use-username-check";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const {
    status: usernameStatus,
    reason: usernameReason,
    check: checkUsername,
  } = useUsernameCheck({ delay: 300 });

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(val);
    checkUsername(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus === "taken" || usernameStatus === "invalid") {
      setError(usernameReason || "Please choose a different username.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const ruleError = passwordRuleError(password);
      if (ruleError) { setError(ruleError); return; }

      const { error: signUpError } = await (
        authClient.signUp.email as unknown as (data: {
          name: string;
          email: string;
          password: string;
          username?: string;
          callbackURL?: string;
        }) => Promise<{ error?: { message?: string } | null }>
      )({
        name,
        email,
        password,
        username,
        callbackURL: window.location.origin + "/",
      });
      if (signUpError) {
        setError(signUpError.message ?? "Failed to create account");
        return;
      }

      // Best effort sync
      try {
        await getApi().me.updateUsername(username);
      } catch { /* non-blocking */ }

      setVerificationSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setError("");
    try {
      await authClient.sendVerificationEmail({
        email,
        callbackURL: window.location.origin + "/",
      });
    } catch {
      setError("Failed to resend verification email. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: window.location.origin + "/",
      });
    } catch {
      setGoogleLoading(false);
    }
  };

  if (verificationSent) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-6 py-6 sm:py-8">
        <header className="flex items-center justify-between pt-2">
          <Link
            to="/welcome"
            className="inline-flex size-10 items-center justify-center rounded-full bg-secondary/80 text-foreground transition-all hover:bg-secondary active:scale-95 border border-white/20 dark:border-white/10"
            aria-label="Back to welcome screen"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex items-center gap-2">
            <AppLogo className="size-9 rounded-xl shadow-sm" imgClassName="size-5" />
            <span className="text-xl font-bold tracking-tight">Ledg</span>
          </div>
          <div className="size-10" aria-hidden="true" />
        </header>

        <main className="my-auto w-full py-6 text-center">
          <Mail className="mx-auto size-16 text-primary mb-4" />
          <h1 className="text-2xl font-extrabold tracking-tight">Check your email</h1>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            We've sent a verification link to <strong>{email}</strong>
          </p>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Click the link to verify your account and get started.
          </p>

          <Button
            type="button"
            variant="outline"
            onClick={handleResendVerification}
            disabled={resendLoading}
            className="mt-6 w-full gap-2"
          >
            {resendLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            Resend verification email
          </Button>

          {error && <p className="mt-4 text-xs font-medium text-destructive">{error}</p>}
        </main>

        <footer className="pb-4 text-center text-xs font-medium text-muted-foreground">
          Track spending in under five seconds.
        </footer>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-6 py-6 sm:py-8">
      {/* Top Header Navigation */}
      <header className="flex items-center justify-between pt-2">
        <Link
          to="/welcome"
          className="inline-flex size-10 items-center justify-center rounded-full bg-secondary/80 text-foreground transition-all hover:bg-secondary active:scale-95 border border-white/20 dark:border-white/10"
          aria-label="Back to welcome screen"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex items-center gap-2">
          <AppLogo className="size-9 rounded-xl shadow-sm" imgClassName="size-5" />
          <span className="text-xl font-bold tracking-tight">Ledg</span>
        </div>
        <div className="size-10" aria-hidden="true" />
      </header>

      {/* Main Content Form */}
      <main className="my-auto w-full py-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Track spending in under five seconds.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Full name
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
                {(usernameStatus === "taken" || usernameStatus === "invalid") && (
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
              Email
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

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Password
            </label>
            <PasswordInput
              id="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordStrength password={password} />
          </div>

          {error && <p className="text-xs font-medium text-destructive">{error}</p>}

          <Button
            type="submit"
            size="lg"
              disabled={
              loading ||
              usernameStatus === "taken" ||
              usernameStatus === "invalid"
            }

            className="h-12 w-full text-base font-semibold shadow-md"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <><UserPlus className="size-4 mr-2" />Create account</>}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <div className="h-px flex-1 bg-border/80" />
          <span>or</span>
          <div className="h-px flex-1 bg-border/80" />
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={googleLoading}
          onClick={handleGoogle}
          className="h-12 w-full text-base font-semibold"
        >
          {googleLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <GoogleIcon className="size-5" />
          )}
          Continue with Google
        </Button>

        <p className="mt-6 text-center text-sm font-medium text-muted-foreground">
          Already have an account?{" "}
          <Link to="/sign-in" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </main>

      {/* Footer */}
      <footer className="pb-4 text-center text-xs font-medium text-muted-foreground">
        Track spending in under five seconds.
      </footer>
    </div>
  );
}
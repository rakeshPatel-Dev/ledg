import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Mail, RotateCcw, X } from "lucide-react";

import AppLogo from "@/components/common/app-logo";
import { GoogleIcon } from "@/components/common/google-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/lib/auth-provider";

export default function SignInPage() {
  const navigate = useNavigate();
  const { refetch } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
      });
      if (signInError) {
        if (signInError.status === 403 && signInError.message?.includes("verify")) {
          setShowVerificationModal(true);
          return;
        }
        setError(signInError.message ?? "Invalid email or password");
        return;
      }
      await refetch();
      navigate("/");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      await authClient.sendVerificationEmail({
        email,
        callbackURL: window.location.origin + "/",
      });
      setShowVerificationModal(false);
    } catch {
      setError("Failed to resend verification email. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const { error: socialError } = await authClient.signIn.social({
        provider: "google",
        callbackURL: window.location.origin + "/",
      });
      if (socialError) {
        setError(socialError.message ?? "Google sign-in failed");
      }
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

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
          <h1 className="text-2xl font-extrabold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Sign in to track your spending.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-xs font-medium text-destructive">{error}</p>}

          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className="h-12 w-full text-base font-semibold shadow-md"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
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
          Don&apos;t have an account?{" "}
          <Link to="/sign-up" className="font-semibold text-primary hover:underline">
            Create one
          </Link>
        </p>
      </main>

      {/* Footer */}
      <footer className="pb-4 text-center text-xs font-medium text-muted-foreground">
        Track spending in under five seconds.
      </footer>

      {showVerificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Verify your email</h2>
              <button
                onClick={() => setShowVerificationModal(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            <Mail className="mx-auto size-12 text-primary mt-4 mb-2" />
            <p className="text-center text-sm font-medium text-muted-foreground">
              Your email <strong>{email}</strong> hasn't been verified yet.
            </p>
            <p className="mt-1 text-center text-sm font-medium text-muted-foreground">
              We've sent a verification link. Check your inbox and click the link to activate your account.
            </p>
            <Button
              type="button"
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
          </div>
        </div>
      )}
    </div>
  );
}
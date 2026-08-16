import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";

import AppLogo from "@/components/common/AppLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/lib/auth-provider";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.4 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.4 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/>
    </svg>
  );
}

export default function SignInPage() {
  const navigate = useNavigate();
  const { refetch } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-4 py-6 sm:py-8">
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
            <Input
              id="password"
              type="password"
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
    </div>
  );
}
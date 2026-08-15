import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { Zap, ShieldCheck, PieChart } from "lucide-react";

import AppLogo from "@/components/common/AppLogo";
import { Button } from "@/components/ui/button";

export default function WelcomePage() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  if (isSignedIn) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-6 py-10">
      {/* Top Header / Branding */}
      <header className="flex flex-col items-center gap-4 text-center pt-8">
        <AppLogo className="size-20 rounded-3xl shadow-xl shadow-primary/25" imgClassName="size-12" />
        <div className="space-y-1">
          <h1
            id="welcome-heading"
            className="text-4xl font-black tracking-tight text-foreground"
          >
            Ledg
          </h1>
          <p className="max-w-xs text-sm font-medium text-muted-foreground">
            Track spending in under five seconds.
          </p>
        </div>
      </header>

      {/* Feature Highlights */}
      <main className="my-auto py-8">
        <div className="grid gap-3">
          <div className="flex items-center gap-3.5 rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Zap className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">5-Second Logging</p>
              <p className="text-xs text-muted-foreground">Snap or type expenses instantly on the go.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <PieChart className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Smart Analytics</p>
              <p className="text-xs text-muted-foreground">Understand where your money goes monthly.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Private & Cloud Synced</p>
              <p className="text-xs text-muted-foreground">Your financial data is encrypted and safe.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Action Buttons */}
      <footer className="flex flex-col gap-3">
        <Button variant="default" size="lg" className="h-13 w-full rounded-full text-base font-semibold shadow-md" render={<Link to="/sign-up" />}>
          Get Started (Register)
        </Button>
        <Button variant="outline" size="lg" className="h-13 w-full rounded-full text-base font-semibold" render={<Link to="/sign-in" />}>
          I already have an account (Login)
        </Button>

        <nav className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pb-2 text-xs font-medium text-muted-foreground">
          <Link to="/privacy" className="transition-colors hover:text-foreground">
            Privacy Policy
          </Link>
          <span className="text-border">·</span>
          <Link to="/terms" className="transition-colors hover:text-foreground">
            Terms of Service
          </Link>
          <span className="text-border">·</span>
          <Link to="/data-deletion" className="transition-colors hover:text-foreground">
            Delete My Data
          </Link>
        </nav>
      </footer>
    </div>
  );
}


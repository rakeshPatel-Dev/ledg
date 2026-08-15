import { Link } from "react-router-dom";
import { SignUp } from "@clerk/react";
import { ArrowLeft } from "lucide-react";

import AppLogo from "@/components/common/AppLogo";
import { useClerkAppearance } from "@/lib/clerk-theme";

export default function SignUpPage() {
  const appearance = useClerkAppearance();

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
        <SignUp appearance={appearance} />
      </main>

      {/* Footer */}
      <footer className="pb-4 text-center text-xs font-medium text-muted-foreground">
        Track spending in under five seconds.
      </footer>
    </div>
  );
}


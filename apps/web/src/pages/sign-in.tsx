import { SignIn } from "@clerk/react";
import { Wallet } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-16 items-center justify-center rounded-4xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <Wallet className="size-8" />
        </span>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Ledg</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track spending in under five seconds.
          </p>
        </div>
      </div>

      <div className="w-full max-w-sm rounded-4xl bg-card p-2 shadow-lg">
        <SignIn />
      </div>
    </div>
  );
}

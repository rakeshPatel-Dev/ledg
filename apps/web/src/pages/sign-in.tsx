import AppLogo from "@/components/common/AppLogo";
import { SignIn } from "@clerk/react";

export default function SignInPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <AppLogo/>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Ledg</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track spending in under five seconds.
          </p>
        </div>
      </div>

        <SignIn />
    </div>
  );
}

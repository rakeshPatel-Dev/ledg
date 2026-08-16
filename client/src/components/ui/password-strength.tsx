import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";

const PASSWORD_RULES = [
  {
    label: "At least 8 characters",
    test: (value: string) => value.length >= 8,
  },
  {
    label: "One uppercase letter",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    label: "One lowercase letter",
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    label: "One number",
    test: (value: string) => /\d/.test(value),
  },
] as const;

export function isStrongPassword(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

export function passwordRuleError(password: string): string | null {
  const unmet = PASSWORD_RULES.find((rule) => !rule.test(password));
  return unmet ? `Password must include ${unmet.label.toLowerCase()}` : null;
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const met = PASSWORD_RULES.filter((rule) => rule.test(password)).length;
  const allMet = met === PASSWORD_RULES.length;

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex gap-1" aria-hidden="true">
        {PASSWORD_RULES.map((_, index) => (
          <span
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              index < met
                ? allMet
                  ? "bg-emerald-500"
                  : "bg-amber-500"
                : "bg-muted-foreground/20"
            )}
          />
        ))}
      </div>
      <ul className="space-y-0.5">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li
              key={rule.label}
              className="flex items-center gap-1.5 text-xs font-medium"
            >
              {ok ? (
                <Check className="size-3.5 shrink-0 text-emerald-500" />
              ) : (
                <X className="size-3.5 shrink-0 text-muted-foreground/50" />
              )}
              <span className={ok ? "text-foreground" : "text-muted-foreground"}>
                {rule.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
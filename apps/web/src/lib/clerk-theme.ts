import { useEffect, useState } from "react";
import { dark } from "@clerk/themes";

import { useTheme } from "./theme-provider";

export function getClerkAppearance(isDark: boolean) {
  return {
    baseTheme: isDark ? dark : undefined,
    variables: {
      colorPrimary: "oklch(0.62 0.145 158)",
      colorBackground: "transparent",
      colorDanger: "oklch(0.6 0.19 27)",
      borderRadius: "1rem",
      fontFamily: "Inter Variable, system-ui, sans-serif",
    },
    elements: {
      rootBox: "w-full max-w-sm mx-auto",
      cardBox:
        "w-full shadow-2xl rounded-3xl !border !border-white/30 dark:!border-white/10 !bg-card/85 dark:!bg-card/75 backdrop-blur-2xl backdrop-saturate-180 overflow-hidden [--cl-color-text:var(--foreground)] [--cl-color-text-secondary:var(--muted-foreground)] [--cl-color-input-text:var(--foreground)] [--cl-color-input-background:transparent] [--cl-color-border:var(--border)]",
      card: "w-full shadow-none border-none bg-transparent p-6 sm:p-8 rounded-3xl",
      headerTitle: "text-2xl font-extrabold tracking-tight !text-foreground text-center",
      headerSubtitle: "!text-muted-foreground text-sm text-center mt-1.5",
      header: "text-center space-y-1 mb-6",

      // Badges ("Last used" badge)
      badge:
        "rounded-full !bg-accent/80 dark:!bg-accent/60 !text-foreground text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 !border !border-white/20 dark:!border-white/10 shadow-xs",
      formFieldBadge:
        "rounded-full !bg-accent/80 dark:!bg-accent/60 !text-foreground text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 !border !border-white/20 dark:!border-white/10 shadow-xs",
      socialButtonsBlockButtonBadge:
        "rounded-full !bg-accent/80 dark:!bg-accent/60 !text-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 !border !border-white/20 dark:!border-white/10 shadow-xs",
      identityPreviewBadge:
        "rounded-full !bg-accent/80 dark:!bg-accent/60 !text-foreground text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 !border !border-white/20 dark:!border-white/10 shadow-xs",

      // Social Buttons & Borders
      socialButtonsBlockButton:
        "rounded-full !border !border-white/20 dark:!border-white/15 !bg-card/70 dark:!bg-card/50 hover:!bg-accent !text-foreground font-semibold py-3 px-4 shadow-xs transition-all flex items-center justify-center gap-2.5 text-sm active:scale-[0.98]",
      socialButtonsBlockButtonText: "font-semibold !text-foreground text-sm",
      socialButtonsProviderIcon: "size-5",

      // Divider & Line
      dividerRow: "my-4 flex items-center justify-center",
      dividerLine: "!bg-border/80 dark:!bg-white/20 !h-px my-4",
      dividerText:
        "!text-muted-foreground text-xs font-bold uppercase tracking-wider !bg-card/90 dark:!bg-card/90 px-3.5 py-1 rounded-full !border !border-white/20 dark:!border-white/10 shadow-xs",

      // Input Labels, Fields & Text
      formFieldLabel:
        "!text-foreground font-semibold text-xs tracking-wider uppercase mb-1.5 block",
      formFieldInput:
        "w-full rounded-2xl !border !border-white/25 dark:!border-white/15 !bg-card/70 dark:!bg-card/50 !text-foreground placeholder:!text-muted-foreground/60 px-4 py-3.5 text-sm focus:!ring-2 focus:!ring-primary focus:!border-primary transition-all shadow-xs outline-none focus:!bg-card/90",
      formFieldInputShowPasswordButton:
        "!text-muted-foreground hover:!text-foreground font-semibold text-xs transition-colors px-3 py-1 rounded-lg",
      formFieldInputShowPasswordIcon:
        "!text-muted-foreground hover:!text-foreground size-4",
      formFieldHintText:
        "!text-muted-foreground text-xs mt-1.5 font-medium leading-normal",

      // Primary Action Button & Border
      formButtonPrimary:
        "w-full rounded-full !bg-primary !text-primary-foreground font-semibold h-12 text-base shadow-md hover:!bg-primary/90 active:scale-[0.98] transition-all border-none cursor-pointer mt-2",

      // Footer, Links & Secured By Clerk
      footerActionLink: "!text-primary font-semibold hover:underline text-sm ml-1.5",
      footerActionText: "!text-muted-foreground text-sm font-medium",
      footerAction: "bg-transparent border-none shadow-none p-0 flex justify-center items-center mt-4",
      footer: "bg-transparent text-center border-none shadow-none pt-4 pb-2",
      footerRow: "bg-transparent border-none shadow-none p-0",
      devModeNoticeRow:
        "bg-transparent !text-amber-500/90 dark:!text-amber-400/90 text-xs font-semibold border-none shadow-none pt-2 text-center",
      footerPages: "bg-transparent border-none shadow-none p-0 flex items-center justify-center gap-1.5 opacity-90",
      footerPagesLink:
        "!text-muted-foreground hover:!text-foreground transition-colors flex items-center gap-1 text-xs font-medium",

      // Identity Preview & OTP
      identityPreviewText: "!text-foreground font-medium text-sm",
      identityPreviewEditButton:
        "!text-primary font-semibold text-sm hover:underline ml-1.5",
      formResendCodeLink: "!text-primary font-semibold text-sm hover:underline",
      otpCodeFieldInput:
        "rounded-2xl !border !border-white/25 dark:!border-white/15 !bg-card/70 dark:!bg-card/50 !text-foreground focus:!border-primary text-center font-bold text-lg h-12 shadow-xs",

      // Error & Alert
      formFieldErrorText: "text-xs !text-destructive font-medium mt-1.5",
      formFieldSuccessText: "text-xs !text-emerald-500 dark:!text-emerald-400 font-medium mt-1.5",
      alert:
        "rounded-2xl !bg-destructive/10 !border !border-destructive/20 p-3.5 !text-destructive text-xs font-medium mb-4",
      alertText: "text-xs font-medium !text-destructive",

      // User Button Popover
      userButtonPopoverCard:
        "rounded-3xl !border !border-white/20 dark:!border-white/10 !bg-card/90 dark:!bg-card/80 backdrop-blur-2xl shadow-2xl p-2 [--cl-color-text:var(--foreground)] [--cl-color-text-secondary:var(--muted-foreground)]",
      userButtonPopoverActionButton:
        "rounded-xl hover:!bg-accent font-medium text-sm !text-foreground",
      userButtonPopoverActionButtonText: "text-sm font-medium !text-foreground",
      userButtonPopoverFooter: "hidden",
    },
  };
}

export function useClerkAppearance() {
  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return theme === "dark";
  });

  useEffect(() => {
    const updateTheme = () => {
      if (theme === "system") {
        setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
      } else {
        setIsDark(theme === "dark");
      }
    };

    updateTheme();

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", updateTheme);
      return () => mediaQuery.removeEventListener("change", updateTheme);
    }
  }, [theme]);

  return getClerkAppearance(isDark);
}

export const clerkAppearance = getClerkAppearance(false);

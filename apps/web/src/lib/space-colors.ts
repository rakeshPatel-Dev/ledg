import { Wallet, Users, Plane, Building2 } from "lucide-react";
import type { SpaceType } from "@ledg/shared";

export const SPACE_TYPE_ICONS: Record<SpaceType, typeof Wallet> = {
  personal: Wallet,
  family: Users,
  trip: Plane,
  business: Building2,
};

export const SPACE_TYPE_BG: Record<SpaceType, string> = {
  personal: "bg-emerald-500/10 dark:bg-emerald-500/20",
  family: "bg-rose-500/10 dark:bg-rose-500/20",
  trip: "bg-sky-500/10 dark:bg-sky-500/20",
  business: "bg-amber-500/10 dark:bg-amber-500/20",
};

export const SPACE_TYPE_TEXT: Record<SpaceType, string> = {
  personal: "text-emerald-600 dark:text-emerald-400",
  family: "text-rose-600 dark:text-rose-400",
  trip: "text-sky-600 dark:text-sky-400",
  business: "text-amber-600 dark:text-amber-400",
};

export const SPACE_TYPE_BADGE: Record<SpaceType, string> = {
  personal: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  family: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  trip: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
  business: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
};

export const SPACE_TYPE_BORDER: Record<SpaceType, string> = {
  personal: "border-emerald-500/30",
  family: "border-rose-500/30",
  trip: "border-sky-500/30",
  business: "border-amber-500/30",
};

export function getBalanceColor(balance: number): string {
  if (balance > 0) return "text-emerald-600 dark:text-emerald-400";
  if (balance < 0) return "text-rose-600 dark:text-rose-400";
  return "text-foreground";
}

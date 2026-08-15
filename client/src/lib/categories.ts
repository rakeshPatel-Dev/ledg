import {
  Utensils,
  ShoppingCart,
  Bus,
  House,
  Receipt,
  ShoppingBag,
  Clapperboard,
  HeartPulse,
  Plane,
  GraduationCap,
  Banknote,
  Briefcase,
  Coins,
  type LucideIcon,
} from "lucide-react";

export interface CategoryMeta {
  name: string;
  icon: LucideIcon;
  color: string;
  defaultsTo: TransactionType;
}

import type { TransactionType } from "@ledg/shared";

export const CATEGORIES: CategoryMeta[] = [
  { name: "Food", icon: Utensils, color: "#E8590C", defaultsTo: "expense" },
  { name: "Groceries", icon: ShoppingCart, color: "#2F9E44", defaultsTo: "expense" },
  { name: "Transport", icon: Bus, color: "#1971C2", defaultsTo: "expense" },
  { name: "Rent", icon: House, color: "#B02586", defaultsTo: "expense" },
  { name: "Bills", icon: Receipt, color: "#7A5A00", defaultsTo: "expense" },
  { name: "Shopping", icon: ShoppingBag, color: "#C2255C", defaultsTo: "expense" },
  { name: "Entertainment", icon: Clapperboard, color: "#6741D9", defaultsTo: "expense" },
  { name: "Health", icon: HeartPulse, color: "#E03131", defaultsTo: "expense" },
  { name: "Travel", icon: Plane, color: "#0B7285", defaultsTo: "expense" },
  { name: "Education", icon: GraduationCap, color: "#A9A900", defaultsTo: "expense" },
  { name: "Salary", icon: Banknote, color: "#2B8A3E", defaultsTo: "income" },
  { name: "Business", icon: Briefcase, color: "#3B5BDB", defaultsTo: "income" },
  { name: "Other", icon: Coins, color: "#868E96", defaultsTo: "expense" },
];

const categoryMap = new Map(
  CATEGORIES.map((c) => [c.name.toLowerCase(), c])
);

export function getCategoryMeta(name: string): CategoryMeta {
  return (
    categoryMap.get(name.toLowerCase()) ??
    CATEGORIES[CATEGORIES.length - 1]
  );
}

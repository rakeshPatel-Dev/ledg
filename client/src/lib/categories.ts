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
  Laptop,
  TrendingUp,
  Gift,
  RotateCcw,
  Landmark,
  Building,
  Users,
  Coins,
  HandCoins,
  type LucideIcon,
} from "lucide-react";
import type { TransactionType } from "@ledg/shared";

export interface CategoryMeta {
  name: string;
  icon: LucideIcon;
  color: string;
  defaultsTo: TransactionType;
}

export const EXPENSE_CATEGORIES: CategoryMeta[] = [
  { name: "Food", icon: Utensils, color: "#E8590C", defaultsTo: "expense" },
  { name: "Groceries", icon: ShoppingCart, color: "#2F9E44", defaultsTo: "expense" },
  { name: "Transport", icon: Bus, color: "#1971C2", defaultsTo: "expense" },
  { name: "Rent", icon: House, color: "#B02586", defaultsTo: "expense" },
  { name: "Bills", icon: Receipt, color: "#D97706", defaultsTo: "expense" },
  { name: "Shopping", icon: ShoppingBag, color: "#C2255C", defaultsTo: "expense" },
  { name: "Entertainment", icon: Clapperboard, color: "#6741D9", defaultsTo: "expense" },
  { name: "Health", icon: HeartPulse, color: "#E03131", defaultsTo: "expense" },
  { name: "Travel", icon: Plane, color: "#0B7285", defaultsTo: "expense" },
  { name: "Education", icon: GraduationCap, color: "#CA8A04", defaultsTo: "expense" },
  { name: "Family", icon: Users, color: "#059669", defaultsTo: "expense" },
  { name: "Due paid", icon: HandCoins, color: "#7C3AED", defaultsTo: "expense" },
  { name: "Other", icon: Coins, color: "#868E96", defaultsTo: "expense" },
];

export const INCOME_CATEGORIES: CategoryMeta[] = [
  { name: "Salary", icon: Banknote, color: "#16A34A", defaultsTo: "income" },
  { name: "Business", icon: Briefcase, color: "#2563EB", defaultsTo: "income" },
  { name: "Freelance", icon: Laptop, color: "#7C3AED", defaultsTo: "income" },
  { name: "Investment", icon: TrendingUp, color: "#0D9488", defaultsTo: "income" },
  { name: "Gift", icon: Gift, color: "#DB2777", defaultsTo: "income" },
  { name: "Refund", icon: RotateCcw, color: "#EA580C", defaultsTo: "income" },
  { name: "Interest", icon: Landmark, color: "#4F46E5", defaultsTo: "income" },
  { name: "Rental", icon: Building, color: "#0891B2", defaultsTo: "income" },
  { name: "Due received", icon: HandCoins, color: "#059669", defaultsTo: "income" },
  { name: "Other", icon: Coins, color: "#64748B", defaultsTo: "income" },
];

export const CATEGORIES: CategoryMeta[] = [
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES.filter((c) => !EXPENSE_CATEGORIES.some((e) => e.name === c.name)),
];

const categoryMap = new Map(
  [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => [c.name.toLowerCase(), c])
);

export function getCategoriesByType(type: TransactionType): CategoryMeta[] {
  return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function getCategoryMeta(name: string, type?: TransactionType): CategoryMeta {
  const lower = name.toLowerCase();
  if (type) {
    // Resolve within the type-specific list so duplicate names (e.g. "Other")
    // pick the correct expense/income metadata, falling back within the list.
    const list = getCategoriesByType(type);
    return (
      list.find((c) => c.name.toLowerCase() === lower) ??
      list[list.length - 1]
    );
  }
  const match = categoryMap.get(lower);
  if (match) return match;
  return EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
}

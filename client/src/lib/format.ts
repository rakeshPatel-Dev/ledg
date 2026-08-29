export function formatCurrency(amount: number, currency = "NPR"): string {
  if (currency === "NPR") {
    const formattedNum = new Intl.NumberFormat("en-NP", {
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
    return `Rs. ${formattedNum}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatCompact(amount: number, currency = "NPR"): string {
  if (currency === "NPR") {
    const formattedNum = new Intl.NumberFormat("en-NP", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
    return `Rs. ${formattedNum}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

function parseLocalDate(date: string | Date): Date {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(date);
}

export function formatDate(date: string | Date): string {
  return parseLocalDate(date).toLocaleDateString("en-NP", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString("en-NP", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function localDateKey(date: string | Date): string {
  const d = parseLocalDate(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function monthKey(date: string | Date): string {
  const d = parseLocalDate(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function relativeDay(date: string | Date): string {
  const d = parseLocalDate(date);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfDay = new Date(d);
  startOfDay.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (startOfToday.getTime() - startOfDay.getTime()) / 86_400_000
  );

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff < 7) {
    return d.toLocaleDateString("en-NP", { weekday: "long" });
  }
  return formatDate(d);
}

/**
 * Compact relative date for tight UI (due date labels, card rows, etc.)
 * Past:   "Today", "Yesterday", "3d ago", "2w ago", "3mo ago"
 * Future: "Tomorrow", "in 3d", "in 2w", "in 3mo"
 * Far:    "3 Aug" (current year) or "3 Aug 24" (past year)
 */
export function formatRelativeCompact(date: string | Date): string {
  const d = parseLocalDate(date);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const dayStart = new Date(d);
  dayStart.setHours(0, 0, 0, 0);

  const diffMs = dayStart.getTime() - todayStart.getTime();
  const diffDays = Math.round(diffMs / 86_400_000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays <= 13) return `in ${diffDays}d`;
  if (diffDays >= 14 && diffDays <= 59) return `in ${Math.round(diffDays / 7)}w`;
  if (diffDays < -1 && diffDays >= -13) return `${Math.abs(diffDays)}d ago`;
  if (diffDays < -13 && diffDays >= -59) return `${Math.round(Math.abs(diffDays) / 7)}w ago`;

  // Months range
  const absDays = Math.abs(diffDays);
  if (absDays >= 60 && absDays < 365) {
    const months = Math.round(absDays / 30);
    return diffDays > 0 ? `in ${months}mo` : `${months}mo ago`;
  }

  // Fallback: "3 Aug" or "3 Aug 24" for different year
  const currentYear = new Date().getFullYear();
  const opts: Intl.DateTimeFormatOptions =
    d.getFullYear() !== currentYear
      ? { day: "numeric", month: "short", year: "2-digit" }
      : { day: "numeric", month: "short" };
  return d.toLocaleDateString("en-NP", opts);
}

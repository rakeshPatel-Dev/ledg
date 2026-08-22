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

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-NP", {
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
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function monthKey(date: string | Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function todayKey(): string {
  return monthKey(new Date());
}

export function relativeDay(date: string | Date): string {
  const d = new Date(date);
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

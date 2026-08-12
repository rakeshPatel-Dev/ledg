export function formatCurrency(
  amount: number,
  currency = "NPR"
): string {
  if (currency === "NPR") {
    const formattedNum = new Intl.NumberFormat("en-NP", {
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
    return `Rs. ${formattedNum}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function toISODate(date: Date | string): string {
  return new Date(date).toISOString();
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

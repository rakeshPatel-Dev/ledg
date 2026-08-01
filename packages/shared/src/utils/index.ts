export function formatCurrency(
  amount: number,
  currency = "INR"
): string {
  return new Intl.NumberFormat("en-IN", {
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

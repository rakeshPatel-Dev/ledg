function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return digits.slice(-10);
}

/**
 * Stable key for grouping dues by person. A linked account wins because it
 * survives a name or phone correction; a phone beats a name because it can
 * separate two contacts with the same display name.
 */
export function getCounterpartyKey(person: {
  name: string;
  phone?: string | null;
  linkedUserId?: string | null;
}): string {
  if (person.linkedUserId) return `user:${person.linkedUserId}`;

  const phone = normalizePhone(person.phone);
  if (phone) return `phone:${phone}`;

  const name = person.name.trim().replace(/\s+/g, " ").toLowerCase();
  return `name:${name}`;
}

/** A short, readable phone suffix used to tell same-name people apart. */
export function getCounterpartyDisambiguator(phone?: string | null): string | null {
  const digits = normalizePhone(phone);
  if (!digits || digits.length < 4) return null;
  return `…${digits.slice(-4)}`;
}

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
  }).format(amount);
}

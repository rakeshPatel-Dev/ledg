import { PAYMENT_METHODS, type PaymentMethod, type TransactionType } from "@ledg/shared";

/** A row normalised from a CSV or JSON file, ready for the import API. */
export interface ParsedRow {
  spaceId?: string;
  spaceName?: string;
  category: string;
  type: TransactionType;
  amount: number;
  note: string;
  /** ISO timestamp. */
  date: string;
  paymentMethod: PaymentMethod | null;
}

export interface ParseError {
  /** 1-based line in the file, or 1-based index for JSON. */
  row: number;
  message: string;
}

export interface ParsedImport {
  format: "csv" | "json";
  rows: ParsedRow[];
  errors: ParseError[];
  /** Distinct space names present in the file. */
  spaces: string[];
  dateFrom: string | null;
  dateTo: string | null;
  hasSpaceInfo: boolean;
}

const HEADER_ALIASES: Record<string, string[]> = {
  date: ["date", "transactiondate", "txndate", "day", "posted"],
  time: ["time", "transactiontime"],
  type: ["type", "transactiontype", "kind", "direction"],
  category: ["category", "categoryname"],
  amount: ["amount", "amountnpr", "value", "sum", "total"],
  note: ["note", "notes", "description", "memo", "details", "narration"],
  paymentMethod: ["paymentmethod", "payment", "method", "mode"],
  space: ["space", "spacename", "account", "accountname"],
};

const TYPE_ALIASES: Record<string, TransactionType> = {
  expense: "expense",
  debit: "expense",
  dr: "expense",
  out: "expense",
  outflow: "expense",
  spent: "expense",
  income: "income",
  credit: "income",
  cr: "income",
  in: "income",
  inflow: "income",
  received: "income",
};

function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function buildHeaderIndex(headers: string[]): Record<string, number> {
  const normalized = headers.map(normalizeHeader);
  const index: Record<string, number> = {};

  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const position = normalized.findIndex((header) => aliases.includes(header));
    if (position >= 0) index[field] = position;
  }

  return index;
}

/** RFC 4180-ish parser: handles quotes, escaped quotes, CRLF and a BOM. */
export function splitCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char === "\r") {
      // Handled by the following \n (or ignored for lone CR).
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

function normalizeType(raw: string): TransactionType | null {
  return TYPE_ALIASES[raw.trim().toLowerCase()] ?? null;
}

function normalizePaymentMethod(raw: string): PaymentMethod | null {
  const value = raw.trim().toLowerCase();
  if (!value) return null;

  if ((PAYMENT_METHODS as readonly string[]).includes(value)) {
    return value as PaymentMethod;
  }
  if (value.includes("cash")) return "cash";
  if (value.includes("card")) return "card";
  if (
    value.includes("bank") ||
    value.includes("transfer") ||
    value.includes("cheque") ||
    value.includes("check")
  ) {
    return "bank_transfer";
  }
  if (
    value.includes("wallet") ||
    value.includes("esewa") ||
    value.includes("khalti") ||
    value.includes("paypal") ||
    value.includes("upi")
  ) {
    return "wallet";
  }

  return null;
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value === 0) return null;
  return Math.abs(value);
}

function parseTime(raw?: string): { hh: number; mm: number } {
  if (!raw) return { hh: 0, mm: 0 };
  const match = /^(\d{1,2}):(\d{2})/.exec(raw.trim());
  if (!match) return { hh: 0, mm: 0 };
  return { hh: Number(match[1]), mm: Number(match[2]) };
}

/**
 * Build an ISO timestamp from a calendar date in the browser's local zone,
 * which is the same zone the CSV export used to write the date.
 */
function localIso(
  year: number,
  month: number,
  day: number,
  hh: number,
  mm: number
): string | null {
  const date = new Date(year, month - 1, day, hh, mm, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  // Reject overflow such as 2026-02-31 rolling into March.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date.toISOString();
}

function parseDateValue(rawDate: string, rawTime?: string): string | null {
  const date = rawDate.trim();
  if (!date) return null;

  if (/[T ]\d{2}:\d{2}/.test(date)) {
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  const ymd = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(date);
  if (ymd) {
    const { hh, mm } = parseTime(rawTime);
    return localIso(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]), hh, mm);
  }

  // Day-first, the convention outside the US; the app is Nepal-based.
  const dmy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(date);
  if (dmy) {
    const { hh, mm } = parseTime(rawTime);
    return localIso(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]), hh, mm);
  }

  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function summarise(
  format: ParsedImport["format"],
  rows: ParsedRow[],
  errors: ParseError[]
): ParsedImport {
  const dates = rows.map((row) => row.date).sort((a, b) => a.localeCompare(b));

  return {
    format,
    rows,
    errors,
    spaces: [
      ...new Set(
        rows.map((row) => row.spaceName).filter((name): name is string => Boolean(name))
      ),
    ],
    dateFrom: dates[0] ?? null,
    dateTo: dates[dates.length - 1] ?? null,
    hasSpaceInfo: rows.some((row) => Boolean(row.spaceId || row.spaceName)),
  };
}

export function parseCsvImport(text: string): ParsedImport {
  const table = splitCsv(text);
  if (table.length === 0) {
    throw new Error("The file is empty");
  }

  const headerIndex = buildHeaderIndex(table[0]);
  const required = ["date", "type", "category", "amount"] as const;
  const missing = required.filter((field) => headerIndex[field] === undefined);

  if (missing.length > 0) {
    throw new Error(
      `Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`
    );
  }

  const rows: ParsedRow[] = [];
  const errors: ParseError[] = [];

  for (let i = 1; i < table.length; i++) {
    const cells = table[i];
    const line = i + 1;

    const cell = (field: string): string => {
      const position = headerIndex[field];
      return position === undefined ? "" : (cells[position] ?? "").trim();
    };

    const type = normalizeType(cell("type"));
    if (!type) {
      errors.push({ row: line, message: `Unknown type "${cell("type")}"` });
      continue;
    }

    const category = cell("category");
    if (!category) {
      errors.push({ row: line, message: "Category is empty" });
      continue;
    }

    const amount = parseAmount(cell("amount"));
    if (amount === null) {
      errors.push({ row: line, message: `Invalid amount "${cell("amount")}"` });
      continue;
    }

    const date = parseDateValue(cell("date"), cell("time"));
    if (!date) {
      errors.push({ row: line, message: `Invalid date "${cell("date")}"` });
      continue;
    }

    rows.push({
      spaceName: cell("space") || undefined,
      category,
      type,
      amount,
      note: cell("note"),
      date,
      paymentMethod: normalizePaymentMethod(cell("paymentMethod")),
    });
  }

  return summarise("csv", rows, errors);
}

export function parseJsonImport(text: string): ParsedImport {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid JSON");
  }

  const object = data as {
    transactions?: unknown;
    spaces?: Array<{ id?: unknown; name?: unknown }>;
  };

  const transactions = Array.isArray(data)
    ? data
    : Array.isArray(object?.transactions)
      ? object.transactions
      : null;

  if (!transactions) {
    throw new Error("JSON must be a transaction array or a Ledg backup");
  }

  const spaceNameById = new Map<string, string>();
  for (const space of object?.spaces ?? []) {
    if (space && space.id != null && typeof space.name === "string") {
      spaceNameById.set(String(space.id), space.name);
    }
  }

  const rows: ParsedRow[] = [];
  const errors: ParseError[] = [];

  transactions.forEach((raw, index) => {
    const line = index + 1;
    const item = (raw ?? {}) as Record<string, unknown>;

    const type = normalizeType(String(item.type ?? ""));
    if (!type) {
      errors.push({ row: line, message: `Unknown type "${item.type ?? ""}"` });
      return;
    }

    const category = String(item.category ?? "").trim();
    if (!category) {
      errors.push({ row: line, message: "Category is empty" });
      return;
    }

    const amount =
      typeof item.amount === "number"
        ? item.amount
        : parseAmount(String(item.amount ?? ""));
    if (amount === null || !Number.isFinite(amount) || amount <= 0) {
      errors.push({ row: line, message: `Invalid amount "${item.amount ?? ""}"` });
      return;
    }

    const date = parseDateValue(String(item.date ?? ""));
    if (!date) {
      errors.push({ row: line, message: `Invalid date "${item.date ?? ""}"` });
      return;
    }

    const spaceId =
      typeof item.spaceId === "string" && item.spaceId.trim()
        ? item.spaceId.trim()
        : undefined;
    const explicitName =
      typeof item.spaceName === "string" && item.spaceName.trim()
        ? item.spaceName.trim()
        : undefined;
    const spaceName = explicitName ?? (spaceId ? spaceNameById.get(spaceId) : undefined);

    rows.push({
      spaceId,
      spaceName,
      category,
      type,
      amount,
      note: String(item.note ?? ""),
      date,
      paymentMethod: normalizePaymentMethod(String(item.paymentMethod ?? "")),
    });
  });

  return summarise("json", rows, errors);
}

export function parseImportFile(text: string, fileName: string): ParsedImport {
  const trimmed = text.trim();
  const looksJson =
    fileName.toLowerCase().endsWith(".json") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[");

  return looksJson ? parseJsonImport(trimmed) : parseCsvImport(text);
}

import type { Transaction, Space } from "@ledg/shared";

import { localDateKey } from "./format";

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCSV(field: unknown): string {
  if (field === null || field === undefined) return "";
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportTransactionsToCSV(
  transactions: Transaction[],
  spaces: Space[] = [],
  filename = "ledg-transactions.csv"
) {
  const spaceMap = new Map(spaces.map((s) => [s.id, s.name]));

  const headers = [
    "Date",
    "Time",
    "Type",
    "Category",
    "Amount (NPR)",
    "Note",
    "Payment Method",
    "Space",
    "Transaction ID",
  ];

  const rows = transactions.map((t) => {
    const d = new Date(t.date);
    const dateStr = localDateKey(t.date);
    const timeStr = d.toLocaleTimeString("en-NP", { hour: "2-digit", minute: "2-digit" });
    const spaceName = spaceMap.get(t.spaceId) ?? t.spaceId;

    return [
      escapeCSV(dateStr),
      escapeCSV(timeStr),
      escapeCSV(t.type),
      escapeCSV(t.category),
      escapeCSV(t.amount),
      escapeCSV(t.note || ""),
      escapeCSV(t.paymentMethod || "cash"),
      escapeCSV(spaceName),
      escapeCSV(t.id),
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\r\n");
  downloadFile(csvContent, filename, "text/csv;charset=utf-8;");
}

export function exportTransactionsToJSON(
  transactions: Transaction[],
  spaces: Space[] = [],
  filename = "ledg-backup.json"
) {
  const data = {
    exportedAt: new Date().toISOString(),
    version: "1.0.0",
    spaces,
    transactions,
  };

  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, "application/json;charset=utf-8;");
}

/** Escape a cell for CSV output (and neutralize spreadsheet formulas). */
function csvCell(value: string | number | null | undefined): string {
  let s = String(value ?? "");
  // Formula injection guard: cells starting with =, +, -, @ can execute in Excel.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Trigger a browser download of a CSV file. */
export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(","));
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Serialize a record table (report rows with dynamic headers) to CSV text. */
export function tableToCsv(table: Record<string, string | number | null>[]): string {
  if (table.length === 0) return "No data";
  const headers = Object.keys(table[0]);
  return [
    headers.map(csvCell).join(","),
    ...table.map((row) => headers.map((h) => csvCell(row[h] ?? "")).join(",")),
  ].join("\r\n");
}

/** Trigger a browser download of a CSV file whose content is already serialized. */
export function downloadCsvText(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

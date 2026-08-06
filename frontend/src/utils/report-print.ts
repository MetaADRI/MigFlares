import type { ReportResult } from "@/types";
import { BRAND, REPORT_TYPES, CURRENCY } from "@/constants";
import { formatCurrency, formatDate } from "@/utils/format";

function kindValue(kind: "currency" | "number" | "percent", value: number): string {
  if (kind === "currency") return formatCurrency(value);
  if (kind === "percent") return `${value}%`;
  return value.toLocaleString();
}

function isDateLike(key: string): boolean {
  return /date|visit|wash|issued|created/i.test(key);
}

function isCurrencyLike(key: string): boolean {
  return /total|revenue|amount|value|price|ticket|spent/i.test(key);
}

/** Open a printable report document (PDF via the browser print dialog). */
export function printReport(result: ReportResult): void {
  const meta = REPORT_TYPES.find((r) => r.value === result.type);
  const headers = result.table.length > 0 ? Object.keys(result.table[0]) : [];
  const rows = result.table
    .map(
      (row) =>
        `<tr>${headers
          .map((h) => {
            const value = row[h];
            const cell = isCurrencyLike(h)
              ? formatCurrency(Number(value ?? 0))
              : isDateLike(h)
                ? formatDate(String(value ?? ""))
                : String(value ?? "—");
            return `<td>${escapeHtml(cell)}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(meta?.label ?? result.type)} report</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #f4f4f5; font-family: "Segoe UI", system-ui, sans-serif; color: #111; }
  .sheet { max-width: 210mm; margin: 20px auto; background: #fff; padding: 36px 44px; box-shadow: 0 2px 16px rgba(0,0,0,0.12); }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #F47B20; padding-bottom: 16px; }
  .brand img.logo { width: 150px; height: auto; display: block; }
  .brand h1 { margin: 0; font-size: 22px; letter-spacing: 0.3px; }
  .brand h1 span { color: #F47B20; }
  .brand p { margin: 3px 0 0; font-size: 11px; color: #555; }
  .doc { text-align: right; }
  .doc h2 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; }
  .doc p { margin: 4px 0 0; font-size: 12px; color: #555; }
  .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 22px 0; }
  .card { border: 1px solid #eee; border-radius: 10px; padding: 12px 14px; }
  .card b { display: block; font-size: 17px; }
  .card span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; border-bottom: 1px solid #ddd; padding: 7px 6px; }
  td { padding: 8px 6px; border-bottom: 1px solid #f0f0f0; }
  footer { margin-top: 26px; border-top: 1px solid #eee; padding-top: 12px; font-size: 10px; color: #777; text-align: center; }
  @media print { body { background: #fff; } .sheet { box-shadow: none; margin: 0; } }
</style>
</head>
<body>
  <div class="sheet">
    <header>
      <div class="brand">
        <img class="logo" src="/logo.png" alt="Mig Flares" />
        <p>${escapeHtml(BRAND.fullName)} · ${escapeHtml(BRAND.location)}</p>
      </div>
      <div class="doc">
        <h2>${escapeHtml(meta?.label ?? result.type)} report</h2>
        <p>${escapeHtml(result.periodLabel)}</p>
      </div>
    </header>

    <div class="cards">
      ${result.summary
        .map(
          (s) => `<div class="card"><b>${escapeHtml(kindValue(s.kind, s.value))}</b><span>${escapeHtml(s.label)}</span></div>`,
        )
        .join("")}
    </div>

    ${result.table.length > 0
      ? `<table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h.replace(/([A-Z])/g, " $1"))}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`
      : "<p style='color:#888;font-size:12px'>No data for this period.</p>"}
  </div>
  <footer>
    ${escapeHtml(BRAND.fullName)} · Generated ${escapeHtml(new Date().toLocaleString("en-ZM"))} · All amounts in ${CURRENCY.code}
  </footer>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[ch] ?? ch;
  });
}

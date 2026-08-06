import type { Receipt } from "@/types";
import { BRAND } from "@/constants";
import { formatCurrency, formatDateTime } from "@/utils/format";

export type ReceiptFormat = "thermal" | "a4";

/**
 * Open a styled print window for a receipt. Browsers offer "Save as PDF"
 * from the print dialog, which covers both print and PDF export.
 *
 * - `thermal`: 80mm point-of-sale paper (monospace, dashed separators).
 * - `a4`: letter-style document with a company header and table layout.
 */
export function printReceipt(receipt: Receipt, format: ReceiptFormat = "thermal"): void {
  const html = format === "a4" ? buildA4Html(receipt) : buildThermalHtml(receipt);
  const win = window.open("", "_blank", "width=800,height=1000");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

/* ------------------------------ Thermal ---------------------------- */

function buildThermalHtml(receipt: Receipt): string {
  const lines = [
    ...receipt.items.map(
      (item) =>
        `<tr>
          <td>${escapeHtml(item.name)}</td>
          <td class="r">${formatCurrency(item.price)}</td>
        </tr>`,
    ),
    `<tr class="sep"><td colspan="2"></td></tr>`,
    `<tr><td>Subtotal</td><td class="r">${formatCurrency(receipt.subtotal)}</td></tr>`,
    ...(receipt.discount > 0
      ? [`<tr><td>Discount</td><td class="r">-${formatCurrency(receipt.discount)}</td></tr>`]
      : []),
    ...(receipt.tax > 0
      ? [`<tr><td>Tax</td><td class="r">${formatCurrency(receipt.tax)}</td></tr>`]
      : []),
    `<tr class="total"><td>Total</td><td class="r">${formatCurrency(receipt.total)}</td></tr>`,
    `<tr><td>Paid</td><td class="r">${formatCurrency(receipt.amountPaid)}</td></tr>`,
    `<tr><td>Change</td><td class="r">${formatCurrency(receipt.changeDue)}</td></tr>`,
  ].join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(receipt.receiptNo)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px 16px; background: #f4f4f5; font-family: ui-monospace, "SF Mono", "Cascadia Mono", Menlo, monospace; }
  .paper { max-width: 320px; margin: 0 auto; background: #fff; color: #111; padding: 28px 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.12); }
  .logo { display: block; width: 96px; margin: 0 auto 6px; }
  .sub { text-align: center; font-size: 10px; color: #666; margin-top: 2px; }
  .bar { border-top: 1px dashed #999; margin: 14px 0; }
  .meta { font-size: 11px; color: #333; line-height: 1.7; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  td { padding: 3px 0; vertical-align: top; }
  td.r { text-align: right; white-space: nowrap; }
  .sep td { border-bottom: 1px dashed #bbb; }
  .total { font-weight: 800; font-size: 14px; }
  .qr { width: 84px; height: 84px; margin: 14px auto 4px; display: grid; grid-template-columns: repeat(7, 1fr); grid-template-rows: repeat(7, 1fr); gap: 1px; padding: 4px; border: 1px solid #ddd; }
  .qr i { display: block; background: #111; }
  .foot { text-align: center; font-size: 10px; color: #666; margin-top: 10px; line-height: 1.6; }
  .void { text-align: center; color: #dc2626; font-weight: 800; letter-spacing: 2px; margin-top: 8px; }
  @media print { body { background: #fff; padding: 0; } .paper { box-shadow: none; max-width: none; } }
</style>
</head>
<body>
  <div class="paper">
    <img class="logo" src="/logo.png" alt="Mig Flares" />
    <div class="sub">${escapeHtml(BRAND.location)}</div>
    <div class="bar"></div>
    <div class="meta">
      Receipt: <strong>${escapeHtml(receipt.receiptNo)}</strong><br/>
      Date: ${escapeHtml(formatDateTime(receipt.issuedAt))}<br/>
      Customer: ${escapeHtml(receipt.customerName)}<br/>
      Vehicle: ${escapeHtml(receipt.plateNumber)}<br/>
      ${receipt.employeeName ? `Attendant: ${escapeHtml(receipt.employeeName)}<br/>` : ""}
      ${receipt.customerPhone ? `Phone: ${escapeHtml(receipt.customerPhone)}<br/>` : ""}
      Job: ${escapeHtml(receipt.washJobReference)}
    </div>
    <div class="bar"></div>
    <table>${lines}</table>
    <div class="bar"></div>
    <div class="qr">${qrCells(receipt.receiptNo)}</div>
    <div class="foot">
      Payment: ${escapeHtml(receipt.paymentMethod.replace(/_/g, " "))}<br/>
      Thank you for washing with Mig Flares!<br/>
      Nkoloma Stadium, Lusaka · ${escapeHtml(receipt.issuedByName ?? "Mig Flares")}
    </div>
    ${receipt.status === "VOIDED" ? `<div class="void">VOID</div>` : ""}
  </div>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;
}

/* -------------------------------- A4 ------------------------------- */

function buildA4Html(receipt: Receipt): string {
  const rows = receipt.items
    .map(
      (item, i) => `<tr>
        <td class="num">${i + 1}</td>
        <td>${escapeHtml(item.name)}</td>
        <td class="r">${formatCurrency(item.price)}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(receipt.receiptNo)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #f4f4f5; font-family: "Segoe UI", system-ui, -apple-system, sans-serif; color: #111; }
  .sheet { max-width: 210mm; margin: 24px auto; background: #fff; padding: 40px 48px; box-shadow: 0 2px 16px rgba(0,0,0,0.12); }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #F47B20; padding-bottom: 20px; }
  .brand img.logo { width: 150px; height: auto; display: block; }
  .brand h1 { margin: 0; font-size: 26px; letter-spacing: 0.3px; }
  .brand h1 span { color: #F47B20; }
  .brand p { margin: 4px 0 0; font-size: 12px; color: #555; }
  .doc h2 { margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px; }
  .doc p { margin: 4px 0 0; font-size: 12px; color: #555; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 40px; margin: 24px 0; font-size: 13px; }
  .meta-grid b { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: #888; margin-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: #888; border-bottom: 1px solid #ddd; padding: 8px 6px; }
  td { padding: 10px 6px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  td.num { color: #888; width: 32px; }
  td.r { text-align: right; }
  .totals { width: 260px; margin-left: auto; margin-top: 20px; font-size: 13px; }
  .totals div { display: flex; justify-content: space-between; padding: 5px 6px; }
  .totals .grand { border-top: 2px solid #111; font-weight: 700; font-size: 16px; padding-top: 10px; }
  .qr { width: 92px; height: 92px; margin-top: 24px; display: grid; grid-template-columns: repeat(8, 1fr); grid-template-rows: repeat(8, 1fr); gap: 1px; padding: 5px; border: 1px solid #ddd; }
  .qr i { display: block; background: #111; }
  footer { margin-top: 32px; border-top: 1px solid #eee; padding-top: 14px; font-size: 11px; color: #777; text-align: center; line-height: 1.7; }
  .void-banner { margin-top: 20px; border: 2px solid #dc2626; color: #dc2626; text-align: center; font-weight: 800; letter-spacing: 4px; padding: 12px; font-size: 18px; }
  @media print { body { background: #fff; } .sheet { box-shadow: none; margin: 0; } }
</style>
</head>
<body>
  <div class="sheet">
    <header>
      <div class="brand">
        <img class="logo" src="/logo.png" alt="Mig Flares" />
        <p>${escapeHtml(BRAND.location)}</p>
      </div>
      <div class="doc">
        <h2>Receipt</h2>
        <p>${escapeHtml(receipt.receiptNo)}</p>
      </div>
    </header>

    <div class="meta-grid">
      <div><b>Date &amp; time</b>${escapeHtml(formatDateTime(receipt.issuedAt))}</div>
      <div><b>Payment method</b>${escapeHtml(receipt.paymentMethod.replace(/_/g, " "))}</div>
      <div><b>Customer</b>${escapeHtml(receipt.customerName)}</div>
      <div><b>Attendant</b>${escapeHtml(receipt.employeeName ?? "—")}</div>
      <div><b>Vehicle</b>${escapeHtml(receipt.plateNumber)} · ${escapeHtml(receipt.vehicleSummary)}</div>
      <div><b>Job reference</b>${escapeHtml(receipt.washJobReference)}</div>
    </div>

    <table>
      <thead>
        <tr><th>#</th><th>Service</th><th class="r">Amount</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div><span>Subtotal</span><span>${formatCurrency(receipt.subtotal)}</span></div>
      ${receipt.discount > 0 ? `<div><span>Discount</span><span>-${formatCurrency(receipt.discount)}</span></div>` : ""}
      ${receipt.tax > 0 ? `<div><span>Tax</span><span>${formatCurrency(receipt.tax)}</span></div>` : ""}
      <div class="grand"><span>Total</span><span>${formatCurrency(receipt.total)}</span></div>
      <div><span>Paid</span><span>${formatCurrency(receipt.amountPaid)}</span></div>
      <div><span>Change</span><span>${formatCurrency(receipt.changeDue)}</span></div>
    </div>

    ${receipt.status === "VOIDED" ? `<div class="void-banner">VOID — ${escapeHtml(receipt.voidReason ?? "")}</div>` : ""}

    <div class="qr">${qrCells(receipt.receiptNo)}</div>
    <footer>
      ${escapeHtml(BRAND.fullName)} · ${escapeHtml(BRAND.location)}<br/>
      Issued by ${escapeHtml(receipt.issuedByName ?? "Mig Flares")} · ${escapeHtml(receipt.receiptNo)}<br/>
      Thank you for washing with Mig Flares!
    </footer>
  </div>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;
}

/* ------------------------------ Helpers ---------------------------- */

function qrCells(seed: string): string {
  // Deterministic pseudo-random QR placeholder pattern from the receipt number.
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  let cells = "";
  for (let i = 0; i < 49; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    cells += h % 3 === 0 ? "<i></i>" : "<i style='opacity:0'></i>";
  }
  return cells;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[ch] ?? ch;
  });
}

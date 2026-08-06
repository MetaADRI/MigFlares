import { useEffect, useState } from "react";
import {
  Ban,
  Copy,
  Download,
  Mail,
  Printer,
  RotateCcw,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { receiptsService } from "@/services/receipts.service";
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_META, BRAND } from "@/constants";
import type { Receipt } from "@/types";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { printReceipt, type ReceiptFormat } from "@/utils/receipt-print";

interface ReceiptViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: Receipt | null;
  onChanged: (receipt: Receipt) => void;
}

/** Deterministic QR-code placeholder pattern from the receipt number. */
function QrPlaceholder({ seed }: { seed: string }) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const cells: boolean[] = [];
  for (let i = 0; i < 64; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    cells.push(h % 3 === 0);
  }
  return (
    <div className="mx-auto grid w-20 grid-cols-8 gap-[2px] border border-border/70 p-1.5">
      {cells.map((filled, i) => (
        <span key={i} className={`aspect-square ${filled ? "bg-foreground" : "bg-transparent"}`} />
      ))}
    </div>
  );
}

function Line({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-4 text-[13px] ${className}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

/** Professional POS receipt viewer with print & lifecycle actions. */
export function ReceiptViewDialog({ open, onOpenChange, receipt, onChanged }: ReceiptViewDialogProps) {
  const [voiding, setVoiding] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [format, setFormat] = useState<ReceiptFormat>("thermal");
  const [current, setCurrent] = useState<Receipt | null>(receipt);

  useEffect(() => {
    if (open) {
      setCurrent(receipt);
      setVoiding(false);
      setVoidReason("");
      setFormat("thermal");
    }
  }, [open, receipt]);

  const r = current;

  const handlePrint = () => {
    if (!r) return;
    printReceipt(r, format);
  };

  const handleDuplicate = async () => {
    if (!r) return;
    setBusy(true);
    try {
      const copy = await receiptsService.duplicate(r.id);
      toast.success(`Receipt ${copy.receiptNo} created`);
      onChanged(copy);
    } catch {
      toast.error("Failed to duplicate receipt");
    } finally {
      setBusy(false);
    }
  };

  const handleVoid = async () => {
    if (!r) return;
    if (voidReason.trim().length < 5) {
      toast.error("Please explain why this receipt is being voided");
      return;
    }
    setBusy(true);
    try {
      const updated = await receiptsService.void(r.id, voidReason.trim());
      toast.success("Receipt voided");
      setCurrent(updated);
      setVoiding(false);
      onChanged(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to void receipt");
    } finally {
      setBusy(false);
    }
  };

  const statusMeta = r ? PAYMENT_STATUS_META[r.status] : PAYMENT_STATUS_META.PAID;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="pr-8">
          <DialogTitle>Receipt {r?.receiptNo}</DialogTitle>
          <DialogDescription>
            {r ? formatDateTime(r.issuedAt) : ""}
          </DialogDescription>
        </DialogHeader>

        {r ? (
          <>
            {/* POS paper */}
            <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
              <div className="bg-foreground px-5 py-4 text-background">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display text-lg font-bold leading-none">
                      Mig <span className="text-primary">Flares</span>
                    </p>
                    <p className="mt-1 text-[11px] opacity-70">{BRAND.location}</p>
                  </div>
                  <Badge className={`${statusMeta.className} border-0`}>{statusMeta.label}</Badge>
                </div>
              </div>

              <div className="space-y-3 px-5 py-4 font-mono">
                <div className="space-y-1 border-b border-dashed border-border pb-3 text-[12px]">
                  <Line label="Receipt" value={r.receiptNo} />
                  <Line label="Job" value={r.washJobReference} />
                  <Line label="Customer" value={r.customerName} />
                  {r.customerPhone ? <Line label="Phone" value={r.customerPhone} /> : null}
                  <Line label="Vehicle" value={`${r.plateNumber} · ${r.vehicleSummary}`} />
                  {r.employeeName ? <Line label="Attendant" value={r.employeeName} /> : null}
                </div>

                <div className="space-y-1 border-b border-dashed border-border pb-3">
                  {r.items.map((item, i) => (
                    <div key={i} className="flex items-start justify-between gap-4 text-[13px]">
                      <span className="text-foreground">{item.name}</span>
                      <span className="font-medium text-foreground">{formatCurrency(item.price)}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <Line label="Subtotal" value={formatCurrency(r.subtotal)} />
                  {r.discount > 0 ? <Line label="Discount" value={`-${formatCurrency(r.discount)}`} /> : null}
                  {r.tax > 0 ? <Line label="Tax" value={formatCurrency(r.tax)} /> : null}
                  <Line
                    label="Total"
                    value={formatCurrency(r.total)}
                    className="border-t border-dashed border-border pt-2 [&_span]:text-base [&_span]:font-bold"
                  />
                  <Line label="Paid" value={formatCurrency(r.amountPaid)} />
                  <Line label="Change" value={formatCurrency(r.changeDue)} />
                  <Line label="Method" value={PAYMENT_METHOD_LABEL[r.paymentMethod]} />
                </div>

                <QrPlaceholder seed={r.receiptNo} />
                <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                  Scan to verify
                </p>

                {r.status === "VOIDED" ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center">
                    <p className="text-sm font-bold tracking-widest text-red-600">VOID</p>
                    {r.voidReason ? (
                      <p className="mt-1 text-[11px] text-red-500">Reason: {r.voidReason}</p>
                    ) : null}
                  </div>
                ) : null}

                <p className="border-t border-dashed border-border pt-3 text-center text-[10px] text-muted-foreground">
                  Thank you for washing with us!
                  <br />
                  Issued by {r.issuedByName}
                </p>
              </div>
            </div>

            {/* Actions */}
            {r.status !== "VOIDED" ? (
              voiding ? (
                <div className="space-y-3 rounded-xl border border-red-200 bg-red-50/60 p-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="void-reason" className="text-red-700">
                      Void reason
                    </Label>
                    <Input
                      id="void-reason"
                      placeholder="e.g. Wrong amount charged, customer refunded"
                      value={voidReason}
                      onChange={(e) => setVoidReason(e.target.value)}
                      className="border-red-200 bg-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setVoiding(false)} disabled={busy}>
                      Cancel
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => void handleVoid()} loading={busy}>
                      Confirm void
                    </Button>
                  </div>
                </div>
              ) : (
                <DialogFooter className="flex-wrap gap-2">
                  <div className="flex w-full items-center gap-1.5 rounded-xl border border-border/60 bg-background/60 p-1">
                    {(["thermal", "a4"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFormat(f)}
                        className={cn(
                          "flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                          format === f ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {f === "thermal" ? "Thermal 80mm" : "A4 sheet"}
                      </button>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer /> Print
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Download /> PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void handleDuplicate()} loading={busy}>
                    <Copy /> Duplicate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info("Refunds arrive with the Payments module in Phase 3")}
                  >
                    <RotateCcw /> Refund
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info("Email / WhatsApp sharing arrives in Phase 3")}
                  >
                    <Mail /> Email
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info("Email / WhatsApp sharing arrives in Phase 3")}
                  >
                    <Share2 /> Share
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setVoiding(true)}>
                    <Ban /> Void
                  </Button>
                </DialogFooter>
              )
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

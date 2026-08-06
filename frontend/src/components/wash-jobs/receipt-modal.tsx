import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Logo } from "@/components/common/logo";
import { PAYMENT_METHOD_LABEL } from "@/constants";
import type { Receipt } from "@/types";
import { formatCurrency, formatDateTime } from "@/utils/format";

interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: Receipt | null;
}

export function ReceiptModal({ open, onOpenChange, receipt }: ReceiptModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex-row items-center justify-between space-y-0 pr-8">
          <DialogTitle>Receipt</DialogTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-8 gap-1.5 text-xs"
          >
            <Printer className="size-3.5" /> Print
          </Button>
        </DialogHeader>

        {receipt ? (
          <div className="rounded-2xl border border-dashed border-border bg-background/60 p-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-dashed border-border pb-4">
              <Logo size="sm" />
              <div className="text-right">
                <p className="font-mono text-xs font-bold text-foreground">{receipt.receiptNo}</p>
                <p className="text-[11px] text-muted-foreground">{formatDateTime(receipt.issuedAt)}</p>
              </div>
            </div>

            {/* Meta */}
            <div className="space-y-1 py-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-medium text-foreground">{receipt.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vehicle</span>
                <span className="font-mono font-semibold text-foreground">{receipt.plateNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment</span>
                <span className="font-medium text-foreground">
                  {PAYMENT_METHOD_LABEL[receipt.paymentMethod]}
                </span>
              </div>
            </div>

            {/* Items */}
            <div className="border-t border-dashed border-border pt-4">
              <div className="space-y-2">
                {receipt.items.map((item, index) => (
                  <div key={index} className="flex justify-between gap-3 text-sm">
                    <span className="text-foreground">{item.name}</span>
                    <span className="text-muted-foreground">{formatCurrency(item.price)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1 border-t border-dashed border-border pt-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(receipt.subtotal)}</span>
                </div>
                {receipt.discount > 0 ? (
                  <div className="flex justify-between text-red-500">
                    <span>Discount</span>
                    <span>−{formatCurrency(receipt.discount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-dashed border-border pt-2 text-base">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-display font-bold text-foreground">
                    {formatCurrency(receipt.total)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Amount paid</span>
                  <span>{formatCurrency(receipt.amountPaid)}</span>
                </div>
                {receipt.changeDue > 0 ? (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Change</span>
                    <span>{formatCurrency(receipt.changeDue)}</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Stamp */}
            <div className="mt-6 flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                Mig Flares Car Wash · Nkoloma Stadium
              </p>
              <span className="rounded-lg border-2 border-emerald-500/40 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-600">
                Paid
              </span>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

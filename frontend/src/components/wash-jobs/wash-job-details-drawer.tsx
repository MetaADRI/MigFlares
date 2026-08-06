import type { ReactNode } from "react";
import { Ban, CheckCircle2, Clock, Play, ReceiptText, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/common/status-badge";
import { PAYMENT_METHOD_LABEL, WASH_STATUS_META } from "@/constants";
import type { WashJob } from "@/types";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { cn } from "@/utils/cn";

interface WashJobDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: WashJob | null;
  onStart: (job: WashJob) => void;
  onComplete: (job: WashJob) => void;
  onCancel: (job: WashJob) => void;
  onReceipt: (job: WashJob) => void;
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

export function WashJobDetailsDrawer({
  open,
  onOpenChange,
  job,
  onStart,
  onComplete,
  onCancel,
  onReceipt,
}: WashJobDetailsDrawerProps) {
  if (!job) return null;
  const meta = WASH_STATUS_META[job.status];

  const timeline = [
    { label: "Job created", time: job.createdAt, done: true, icon: Clock },
    { label: "Wash started", time: job.startedAt, done: Boolean(job.startedAt), icon: Play },
    ...(job.status === "CANCELLED"
      ? [{ label: "Job cancelled", time: job.cancelledAt, done: true, icon: Ban }]
      : [{ label: "Wash completed", time: job.completedAt, done: Boolean(job.completedAt), icon: CheckCircle2 }]),
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-md">
        <ScrollArea className="h-full pr-3">
          <SheetHeader className="border-b border-border/60 pb-5 pr-8">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle className="font-mono text-xl font-bold tracking-wide">
                {job.reference}
              </SheetTitle>
              <StatusBadge meta={meta} />
            </div>
            <SheetDescription className="pt-1.5">
              {job.serviceName} · {job.plateNumber} — {job.customerName}
            </SheetDescription>
          </SheetHeader>

          <div className="p-5">
            {/* Timeline */}
            <div className="space-y-0">
              {timeline.map((step, index) => (
                <div key={step.label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-full border",
                        step.done
                          ? "border-primary/30 bg-orange-50 text-primary"
                          : "border-border bg-muted/40 text-muted-foreground",
                      )}
                    >
                      <step.icon className="size-3.5" />
                    </span>
                    {index < timeline.length - 1 ? (
                      <span
                        className={cn(
                          "w-px flex-1",
                          timeline[index + 1].done ? "bg-primary/30" : "bg-border",
                        )}
                      />
                    ) : null}
                  </div>
                  <div className={cn("pb-5", index === timeline.length - 1 && "pb-0")}>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        step.done ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {step.time ? formatDateTime(step.time) : "Pending"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial summary */}
            <div className="mt-6 rounded-xl border border-border/70 bg-background/60 p-4">
              <Row label="Service" value={job.serviceName} />
              <Row label="Service price" value={formatCurrency(job.servicePrice)} />
              {job.extras.map((e) => (
                <Row key={e.id} label={`Extra · ${e.name}`} value={formatCurrency(e.price)} />
              ))}
              <Row label="Subtotal" value={formatCurrency(job.subtotal)} />
              {job.discount > 0 ? (
                <Row label="Discount" value={`−${formatCurrency(job.discount)}`} />
              ) : null}
              <div className="mt-2 flex items-center justify-between border-t border-border/70 pt-2.5">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-display text-lg font-bold text-foreground">
                  {formatCurrency(job.total)}
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="mt-5 space-y-1 rounded-xl border border-border/70 bg-background/60 p-4">
              <Row label="Payment method" value={PAYMENT_METHOD_LABEL[job.paymentMethod]} />
              <Row
                label="Assigned to"
                value={
                  job.employeeName ? (
                    <span className="inline-flex items-center gap-1.5">
                      <UserRound className="size-3.5 text-muted-foreground" /> {job.employeeName}
                    </span>
                  ) : (
                    "Unassigned"
                  )
                }
              />
              {job.receiptNo ? <Row label="Receipt" value={job.receiptNo} /> : null}
              {job.notes ? (
                <div className="pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
                  <p className="mt-1 text-sm text-foreground">{job.notes}</p>
                </div>
              ) : null}
            </div>

            {/* Photos */}
            {job.beforePhotos.length > 0 || job.afterPhotos.length > 0 ? (
              <div className="mt-5 grid grid-cols-2 gap-3">
                {job.beforePhotos.length > 0 ? (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Before</p>
                    <img src={job.beforePhotos[0]} alt="Before" className="h-28 w-full rounded-xl object-cover" />
                  </div>
                ) : null}
                {job.afterPhotos.length > 0 ? (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-muted-foreground">After</p>
                    <img src={job.afterPhotos[0]} alt="After" className="h-28 w-full rounded-xl object-cover" />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </ScrollArea>

        <SheetFooter className="border-t border-border/60 bg-card px-5 py-4">
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            {job.status === "PENDING" ? (
              <Button className="flex-1" onClick={() => onStart(job)}>
                <Play /> Start wash
              </Button>
            ) : null}
            {job.status === "IN_PROGRESS" ? (
              <Button className="flex-1" onClick={() => onComplete(job)}>
                <CheckCircle2 /> Complete & charge
              </Button>
            ) : null}
            {job.receiptNo ? (
              <Button className="flex-1" variant="outline" onClick={() => onReceipt(job)}>
                <ReceiptText /> View receipt
              </Button>
            ) : null}
            {job.status === "PENDING" || job.status === "IN_PROGRESS" ? (
              <Button variant="ghost" onClick={() => onCancel(job)} className="text-destructive hover:text-destructive">
                <Ban /> Cancel
              </Button>
            ) : null}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

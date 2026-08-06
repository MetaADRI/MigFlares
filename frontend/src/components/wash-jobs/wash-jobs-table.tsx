import { Ban, CheckCircle2, Eye, MoreHorizontal, Play, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/common/status-badge";
import { PAYMENT_METHOD_LABEL, WASH_STATUS_META } from "@/constants";
import type { WashJob } from "@/types";
import { formatCurrency, timeAgo } from "@/utils/format";

interface WashJobsTableProps {
  jobs: WashJob[];
  loading: boolean;
  onStart: (job: WashJob) => void;
  onComplete: (job: WashJob) => void;
  onCancel: (job: WashJob) => void;
  onReceipt: (job: WashJob) => void;
  onView: (job: WashJob) => void;
}

export function WashJobsTable({
  jobs,
  loading,
  onStart,
  onComplete,
  onCancel,
  onReceipt,
  onView,
}: WashJobsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Job</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Vehicle</TableHead>
          <TableHead>Service</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-12 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i} className="hover:bg-transparent">
                <TableCell colSpan={8}>
                  <Skeleton className="h-10 w-full" />
                </TableCell>
              </TableRow>
            ))
          : jobs.map((job) => {
              const statusMeta = WASH_STATUS_META[job.status];
              return (
                <TableRow key={job.id}>
                  <TableCell>
                    <p className="font-mono text-xs font-bold tracking-wide text-foreground">
                      {job.reference}
                    </p>
                    <p className="text-xs text-muted-foreground">{timeAgo(job.createdAt)}</p>
                  </TableCell>
                  <TableCell>
                    <p className="truncate text-sm font-medium text-foreground">{job.customerName}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-mono text-xs font-semibold text-foreground">{job.plateNumber}</p>
                    <p className="truncate text-xs text-muted-foreground">{job.vehicleSummary}</p>
                  </TableCell>
                  <TableCell>
                    <p className="truncate text-sm text-foreground">{job.serviceName}</p>
                    {job.extras.length > 0 ? (
                      <p className="truncate text-xs text-muted-foreground">
                        +{job.extras.length} extra{job.extras.length === 1 ? "" : "s"}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-foreground">
                    {formatCurrency(job.total)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {PAYMENT_METHOD_LABEL[job.paymentMethod]}
                  </TableCell>
                  <TableCell>
                    <StatusBadge meta={statusMeta} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Wash job actions">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onView(job)}>
                          <Eye /> View details
                        </DropdownMenuItem>
                        {job.status === "PENDING" ? (
                          <>
                            <DropdownMenuItem onClick={() => onStart(job)}>
                              <Play /> Start wash
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => onCancel(job)}
                            >
                              <Ban /> Cancel job
                            </DropdownMenuItem>
                          </>
                        ) : null}
                        {job.status === "IN_PROGRESS" ? (
                          <>
                            <DropdownMenuItem onClick={() => onComplete(job)}>
                              <CheckCircle2 /> Complete & charge
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => onCancel(job)}
                            >
                              <Ban /> Cancel job
                            </DropdownMenuItem>
                          </>
                        ) : null}
                        {job.receiptNo ? (
                          <DropdownMenuItem onClick={() => onReceipt(job)}>
                            <ReceiptText /> View receipt
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
      </TableBody>
    </Table>
  );
}

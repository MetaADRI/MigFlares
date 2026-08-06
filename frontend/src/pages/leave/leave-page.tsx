import { useCallback, useEffect, useState } from "react";
import { CalendarClock, CalendarPlus, Check, CircleX, Inbox } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/common/page-header";
import { PaginationBar } from "@/components/common/pagination-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { usePermission } from "@/context/permission-context";
import { leaveService, type LeaveRequestInput as LeaveRequestInputSvc } from "@/services/leave.service";
import { employeesService } from "@/services/employees.service";
import { LEAVE_STATUS_META, LEAVE_TYPES } from "@/constants";
import type { Paginated } from "@/types/api";
import type { Employee, LeaveRequest } from "@/types";
import { formatDate } from "@/utils/format";
import { leaveRequestSchema, type LeaveRequestInput } from "@/utils/validation";

const PAGE_SIZE = 10;

export default function LeavePage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission("leave:manage");

  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<LeaveRequest> | null>(null);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [requestOpen, setRequestOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    leaveService
      .list({
        page,
        pageSize: PAGE_SIZE,
        status: status === "all" ? undefined : status,
        type: type === "all" ? undefined : type,
      })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, status, type, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [status, type]);

  useEffect(() => {
    leaveService
      .getPendingCount()
      .then(setPending)
      .catch(() => undefined);
  }, [refreshKey]);

  useEffect(() => {
    return load();
  }, [load]);

  const review = async (req: LeaveRequest, nextStatus: "APPROVED" | "REJECTED") => {
    setBusy(true);
    try {
      await leaveService.review(req.id, nextStatus);
      toast.success(nextStatus === "APPROVED" ? "Leave approved" : "Leave rejected");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update request");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (req: LeaveRequest) => {
    setBusy(true);
    try {
      await leaveService.cancel(req.id);
      toast.success("Leave request cancelled");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel request");
    } finally {
      setBusy(false);
    }
  };

  const isEmpty = !loading && !error && data?.total === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave"
        description="Review requests, approve days off and track balances."
      >
        {canManage ? (
          <Button onClick={() => setRequestOpen(true)}>
            <CalendarPlus /> New Request
          </Button>
        ) : null}
      </PageHeader>

      {pending > 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Inbox className="size-4 shrink-0" />
          <span>
            <span className="font-semibold">{pending}</span> leave request{pending === 1 ? "" : "s"} awaiting review.
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(LEAVE_STATUS_META).map(([value, meta]) => (
              <SelectItem key={value} value={value}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {LEAVE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
        {error ? (
          <ErrorState onRetry={() => setRefreshKey((k) => k + 1)} />
        ) : loading ? (
          <LoadingState label="Loading leave requests…" />
        ) : isEmpty ? (
          <EmptyState
            icon={CalendarClock}
            title="No leave requests"
            description="New requests from staff will appear here."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {LEAVE_TYPES.find((t) => t.value === r.type)?.label ?? r.type}
                    </TableCell>
                    <TableCell>{formatDate(r.startDate)}</TableCell>
                    <TableCell>{formatDate(r.endDate)}</TableCell>
                    <TableCell className="font-medium">{r.days}</TableCell>
                    <TableCell>
                      <StatusBadge meta={LEAVE_STATUS_META[r.status]} />
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {r.reason || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {r.status === "PENDING" ? (
                          <>
                            {canManage ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  loading={busy}
                                  onClick={() => void review(r, "APPROVED")}
                                  className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                >
                                  <Check /> Approve
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  loading={busy}
                                  onClick={() => void review(r, "REJECTED")}
                                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                >
                                  <CircleX /> Reject
                                </Button>
                              </>
                            ) : null}
                            <Button variant="ghost" size="sm" onClick={() => void cancel(r)}>
                              Cancel
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t border-border/60 px-4 py-3.5">
              <PaginationBar
                page={data?.page ?? 1}
                totalPages={data?.totalPages ?? 1}
                total={data?.total ?? 0}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      {canManage ? (
        <NewRequestDialog
          open={requestOpen}
          onOpenChange={setRequestOpen}
          onSaved={() => {
            setRequestOpen(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      ) : null}
    </div>
  );
}

function NewRequestDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LeaveRequestInput>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: { type: "ANNUAL", startDate: "", endDate: "", reason: "" },
  });

  useEffect(() => {
    if (open) {
      reset({ type: "ANNUAL", startDate: "", endDate: "", reason: "" });
      employeesService
        .list({ pageSize: 200 })
        .then((res) => setEmployees(res.data))
        .catch(() => undefined);
    }
  }, [open, reset]);

  const [employeeId, setEmployeeId] = useState("");

  const onSubmit = async (values: LeaveRequestInput) => {
    if (!employeeId) {
      toast.error("Select an employee");
      return;
    }
    setSubmitting(true);
    try {
      const payload: LeaveRequestInputSvc = {
        type: values.type,
        startDate: new Date(values.startDate).toISOString(),
        endDate: new Date(values.endDate).toISOString(),
        reason: values.reason || undefined,
      };
      await leaveService.create(employeeId, payload);
      toast.success("Leave requested");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to request leave");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New leave request</DialogTitle>
          <DialogDescription>
            Days are counted automatically. Annual requests respect remaining balance.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label>Employee</Label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm shadow-sm outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select employee…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} — {e.position}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <select
              value={watch("type")}
              onChange={(e) => setValue("type", e.target.value as LeaveRequestInput["type"])}
              className="flex h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm shadow-sm outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            >
              {LEAVE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {errors.type?.message ? <p className="text-xs text-red-500">{errors.type.message}</p> : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Start date</Label>
              <Input type="date" {...register("startDate")} />
              {errors.startDate?.message ? <p className="text-xs text-red-500">{errors.startDate.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>End date</Label>
              <Input type="date" {...register("endDate")} />
              {errors.endDate?.message ? <p className="text-xs text-red-500">{errors.endDate.message}</p> : null}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea placeholder="Optional — reason for the leave" rows={2} {...register("reason")} />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Request leave
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, CalendarClock, CircleX, PencilLine, UserCheck } from "lucide-react";
import { toast } from "sonner";
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
import { PageHeader } from "@/components/common/page-header";
import { PaginationBar } from "@/components/common/pagination-bar";
import { SearchInput } from "@/components/common/search-input";
import { StatCard } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { LoadingState } from "@/components/common/loading-state";
import { useDebounce } from "@/hooks/use-debounce";
import { usePermission } from "@/context/permission-context";
import { attendanceService } from "@/services/attendance.service";
import { ATTENDANCE_MONTHS, ATTENDANCE_STATUS_META } from "@/constants";
import type { Paginated } from "@/types/api";
import type { AttendanceRecord, AttendanceStatus, AttendanceTodaySummary } from "@/types";
import { formatDate, formatTime } from "@/utils/format";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { attendanceCorrectionSchema, type AttendanceCorrectionInput } from "@/utils/validation";

const PAGE_SIZE = 10;

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function AttendancePage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission("attendance:manage");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [status, setStatus] = useState("all");
  const [month, setMonth] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AttendanceRecord> | null>(null);
  const [today, setToday] = useState<AttendanceTodaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [correcting, setCorrecting] = useState<AttendanceRecord | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    attendanceService
      .list({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        status: status === "all" ? undefined : status,
        month: month === "all" ? undefined : month,
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
  }, [page, debouncedSearch, status, month, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, month]);

  useEffect(() => {
    attendanceService
      .getToday()
      .then(setToday)
      .catch(() => undefined);
  }, [refreshKey]);

  useEffect(() => {
    return load();
  }, [load]);

  const summaryCards = [
    { label: "Present", value: String(today?.present ?? 0), icon: UserCheck },
    { label: "Late", value: String(today?.late ?? 0), icon: CalendarClock },
    { label: "Absent", value: String(today?.absent ?? 0), icon: CircleX },
    { label: "On leave", value: String(today?.onLeave ?? 0), icon: CalendarCheck },
  ];

  const isEmpty = !loading && !error && data?.total === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Daily clock-in board, corrections and shift history."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summaryCards.map((c, i) => (
          <StatCard key={c.label} label={c.label} value={c.value} icon={c.icon} index={i} />
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name or position…"
          className="w-full sm:max-w-xs"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(ATTENDANCE_STATUS_META).map(([value, meta]) => (
              <SelectItem key={value} value={value}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {ATTENDANCE_MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
        {error ? (
          <ErrorState onRetry={() => setRefreshKey((k) => k + 1)} />
        ) : loading ? (
          <LoadingState label="Loading attendance…" />
        ) : isEmpty ? (
          <EmptyState
            icon={CalendarCheck}
            title="No attendance records"
            description="Shift clock-ins and manual records will show up here."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Clock in</TableHead>
                  <TableHead>Clock out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Overtime</TableHead>
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
                      {r.employee ? (
                        <div className="text-xs text-muted-foreground">{r.employee.position}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>{formatDate(r.date)}</TableCell>
                    <TableCell>
                      <StatusBadge meta={ATTENDANCE_STATUS_META[r.status]} />
                    </TableCell>
                    <TableCell>{formatTime(r.clockInAt)}</TableCell>
                    <TableCell>{formatTime(r.clockOutAt)}</TableCell>
                    <TableCell>{r.hoursWorked !== null ? `${r.hoursWorked.toFixed(1)}h` : "—"}</TableCell>
                    <TableCell>{r.overtimeHours !== null && r.overtimeHours > 0 ? `${r.overtimeHours.toFixed(1)}h` : "—"}</TableCell>
                    <TableCell className="text-right">
                      {canManage ? (
                        <Button variant="ghost" size="sm" onClick={() => setCorrecting(r)}>
                          <PencilLine /> Correct
                        </Button>
                      ) : null}
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

      <CorrectDialog
        record={correcting}
        onOpenChange={(open) => {
          if (!open) setCorrecting(null);
        }}
        onSaved={() => {
          setCorrecting(null);
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}

function CorrectDialog({
  record,
  onOpenChange,
  onSaved,
}: {
  record: AttendanceRecord | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AttendanceCorrectionInput>({
    resolver: zodResolver(attendanceCorrectionSchema),
    defaultValues: { status: "PRESENT", clockInAt: "", clockOutAt: "", notes: "" },
  });

  useEffect(() => {
    if (record) {
      reset({
        status: record.status as AttendanceStatus,
        clockInAt: toLocalInput(record.clockInAt),
        clockOutAt: toLocalInput(record.clockOutAt),
        notes: record.notes ?? "",
      });
    }
  }, [record, reset]);

  const onSubmit = async (values: AttendanceCorrectionInput) => {
    if (!record) return;
    setSubmitting(true);
    try {
      await attendanceService.correct(record.id, {
        status: values.status,
        clockInAt: toIso(values.clockInAt ?? ""),
        clockOutAt: toIso(values.clockOutAt ?? ""),
        notes: values.notes || undefined,
      });
      toast.success("Attendance updated");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update attendance");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(record)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Correct attendance</DialogTitle>
          <DialogDescription>
            {record?.employee ? `${record.employee.firstName} ${record.employee.lastName} — ${formatDate(record.date)}` : "Update this record."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <select
              value={watch("status")}
              onChange={(e) => setValue("status", e.target.value as AttendanceStatus)}
              className="flex h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm shadow-sm outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            >
              {Object.entries(ATTENDANCE_STATUS_META).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
            {errors.status?.message ? <p className="text-xs text-red-500">{errors.status.message}</p> : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Clock in</Label>
              <Input type="datetime-local" {...register("clockInAt")} />
            </div>
            <div className="space-y-1.5">
              <Label>Clock out</Label>
              <Input type="datetime-local" {...register("clockOutAt")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea placeholder="Why was this corrected?" rows={2} {...register("notes")} />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save correction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

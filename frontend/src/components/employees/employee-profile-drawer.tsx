import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  CalendarCheck,
  Mail,
  Pencil,
  Phone,
  UserRound,
  Wallet,
  XCircle,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { employeesService } from "@/services/employees.service";
import type { Employee, EmployeeStats, SalaryMonth, TimeEntriesResult } from "@/types";
import { formatCurrency, formatDate, formatTime } from "@/utils/format";

interface EmployeeProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onEdit: (employee: Employee) => void;
}

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-3 text-center">
      <p className="font-display text-lg font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <span className="truncate font-medium text-foreground">{value}</span>
    </div>
  );
}

function errorMessage(err: unknown, fallback: string): string {
  const response = (err as { response?: { data?: { message?: string } } } | null)?.response;
  return response?.data?.message ?? (err instanceof Error ? err.message : fallback);
}

/** Employee profile drawer with performance, payroll and time-clock dashboards. */
export function EmployeeProfileDrawer({ open, onOpenChange, employee, onEdit }: EmployeeProfileDrawerProps) {
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [loading, setLoading] = useState(false);

  const [salary, setSalary] = useState<SalaryMonth[] | null>(null);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [recordMonth, setRecordMonth] = useState("");
  const [recordAmount, setRecordAmount] = useState("");
  const [recordMethod, setRecordMethod] = useState("CASH");
  const [recordBusy, setRecordBusy] = useState(false);

  const [timeData, setTimeData] = useState<TimeEntriesResult | null>(null);
  const [timeLoading, setTimeLoading] = useState(false);
  const [clockBusy, setClockBusy] = useState(false);

  useEffect(() => {
    if (!open || !employee) return;
    let cancelled = false;
    setLoading(true);
    setStats(null);
    employeesService
      .getStats(employee.id)
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, employee]);

  useEffect(() => {
    if (!open || !employee) return;
    let cancelled = false;
    setSalaryLoading(true);
    setSalary(null);
    employeesService
      .getSalaryHistory(employee.id)
      .then((months) => {
        if (cancelled) return;
        setSalary(months);
        const unpaid = months.find((m) => !m.paid);
        setRecordMonth(unpaid?.month ?? "");
        setRecordAmount(unpaid?.salaryAmount != null ? String(unpaid.salaryAmount) : "");
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setSalaryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, employee]);

  useEffect(() => {
    if (!open || !employee) return;
    let cancelled = false;
    setTimeLoading(true);
    setTimeData(null);
    employeesService
      .getTimeEntries(employee.id)
      .then((t) => {
        if (!cancelled) setTimeData(t);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setTimeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, employee]);

  const handleRecordSalary = async () => {
    if (!employee || !recordMonth) return;
    setRecordBusy(true);
    try {
      await employeesService.recordSalaryPayment(employee.id, {
        month: recordMonth,
        amount: recordAmount !== "" ? Number(recordAmount) : undefined,
        method: recordMethod,
      });
      toast.success("Salary payment recorded");
      const updated = await employeesService.getSalaryHistory(employee.id);
      setSalary(updated);
      const unpaid = updated.find((m) => !m.paid);
      setRecordMonth(unpaid?.month ?? "");
      setRecordAmount(unpaid?.salaryAmount != null ? String(unpaid.salaryAmount) : "");
    } catch (err) {
      toast.error(errorMessage(err, "Failed to record payment"));
    } finally {
      setRecordBusy(false);
    }
  };

  const handleClockIn = async () => {
    if (!employee) return;
    setClockBusy(true);
    try {
      const entry = await employeesService.clockIn(employee.id);
      setTimeData((t) => ({ current: entry, entries: t?.entries ?? [] }));
      toast.success("Clocked in");
    } catch (err) {
      toast.error(errorMessage(err, "Failed to clock in"));
    } finally {
      setClockBusy(false);
    }
  };

  const handleClockOut = async () => {
    if (!employee) return;
    setClockBusy(true);
    try {
      const entry = await employeesService.clockOut(employee.id);
      setTimeData((t) => ({ current: null, entries: [entry, ...(t?.entries ?? [])] }));
      toast.success("Clocked out");
    } catch (err) {
      toast.error(errorMessage(err, "Failed to clock out"));
    } finally {
      setClockBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-md">
        <ScrollArea className="h-full pr-3">
          <SheetHeader className="border-b border-border/60 pb-5 pr-8">
            {employee ? (
              <>
                <div className="flex items-center gap-4">
                  <Avatar name={employee.name} src={employee.avatarUrl} className="size-14" />
                  <div className="min-w-0">
                    <SheetTitle className="truncate text-xl">{employee.name}</SheetTitle>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge variant="secondary">{employee.position}</Badge>
                      <Badge
                        variant={employee.isActive ? "success" : "secondary"}
                        dotClassName={employee.isActive ? "bg-emerald-500" : "bg-zinc-400"}
                      >
                        {employee.isActive ? "Active" : "Suspended"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <SheetDescription className="space-y-1.5 pt-3">
                  <InfoRow icon={Phone} label="Phone" value={employee.phone} />
                  {employee.email ? <InfoRow icon={Mail} label="Email" value={employee.email} /> : null}
                  <InfoRow icon={UserRound} label="NRC" value={employee.nrcNumber ?? "—"} />
                  <InfoRow icon={CalendarCheck} label="Hired" value={formatDate(employee.hireDate)} />
                  <InfoRow icon={Wallet} label="Salary" value={employee.salary != null ? formatCurrency(employee.salary) + "/mo" : "—"} />
                </SheetDescription>
              </>
            ) : null}
          </SheetHeader>

          {/* Performance dashboard */}
          <div className="p-5">
            <h4 className="mb-3 text-sm font-semibold text-foreground">Performance</h4>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-3 gap-2.5">
                  <StatCell value={String(stats.carsWashedToday)} label="Today" />
                  <StatCell value={String(stats.carsWashedWeek)} label="This week" />
                  <StatCell value={String(stats.carsWashedMonth)} label="This month" />
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                  <StatCell value={formatCurrency(stats.revenueGenerated)} label="Revenue (mo)" />
                  <StatCell value={`${stats.avgRating} ★`} label="Avg rating" />
                </div>

                <div className="mt-4 space-y-2.5 rounded-xl border border-border/60 bg-background/60 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <BadgeCheck className="size-4 text-emerald-500" /> Completed jobs
                    </span>
                    <span className="font-semibold text-foreground">{stats.attendance.completed}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <XCircle className="size-4 text-red-500" /> Cancelled jobs
                    </span>
                    <span className="font-semibold text-foreground">{stats.attendance.cancelled}</span>
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Completion rate</span>
                      <span className="font-semibold text-foreground">{stats.attendance.completionRate}%</span>
                    </div>
                    <Progress value={stats.attendance.completionRate} className="h-2" />
                  </div>
                </div>
              </>
            ) : null}

            {/* Salary history */}
            <div className="mt-5">
              <div className="mb-2.5 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Salaries</h4>
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Last 6 months</span>
              </div>
              {salaryLoading ? (
                <Skeleton className="h-36 w-full" />
              ) : salary ? (
                <div className="space-y-2.5">
                  {salary.some((m) => !m.paid) ? (
                    <div className="rounded-xl border border-border/60 bg-background/60 p-3.5">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Record payment
                      </p>
                      <div className="space-y-2.5">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Month</Label>
                          <Select value={recordMonth} onValueChange={setRecordMonth}>
                            <SelectTrigger className="h-9 w-full text-sm">
                              <SelectValue placeholder="Select month" />
                            </SelectTrigger>
                            <SelectContent>
                              {salary
                                .filter((m) => !m.paid)
                                .map((m) => (
                                  <SelectItem key={m.month} value={m.month}>
                                    {m.label}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Amount</Label>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={recordAmount}
                              onChange={(e) => setRecordAmount(e.target.value)}
                              className="h-9"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Method</Label>
                            <Select value={recordMethod} onValueChange={setRecordMethod}>
                              <SelectTrigger className="h-9 w-full text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CASH">Cash</SelectItem>
                                <SelectItem value="MOBILE_MONEY">Mobile money</SelectItem>
                                <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                                <SelectItem value="CARD">Card</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button size="sm" className="w-full" loading={recordBusy} onClick={() => void handleRecordSalary()}>
                          Mark as paid
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="overflow-hidden rounded-xl border border-border/60">
                    {salary.map((m, i) => (
                      <div
                        key={m.month}
                        className={`flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm ${
                          i > 0 ? "border-t border-border/50" : ""
                        }`}
                      >
                        <span className="font-medium text-foreground">{m.label}</span>
                        <div className="flex items-center gap-2.5">
                          {m.paid ? (
                            <>
                              <span className="text-xs font-semibold text-emerald-600">
                                {formatCurrency(m.amount ?? 0)}
                              </span>
                              <Badge variant="success" dotClassName="bg-emerald-500">
                                Paid
                              </Badge>
                            </>
                          ) : (
                            <Badge variant="secondary">Unpaid</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Time clock */}
            <div className="mt-5">
              <div className="mb-2.5 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Time clock</h4>
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Shifts</span>
              </div>
              {timeLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : timeData ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/60 px-3.5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex size-2.5">
                        <span
                          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                            timeData.current ? "bg-emerald-400" : "bg-zinc-300"
                          }`}
                        />
                        <span
                          className={`relative inline-flex size-2.5 rounded-full ${
                            timeData.current ? "bg-emerald-500" : "bg-zinc-400"
                          }`}
                        />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {timeData.current ? "Clocked in" : "Not clocked in"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {timeData.current ? `Since ${formatTime(timeData.current.clockInAt)}` : "Start your shift"}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={timeData.current ? "outline" : "default"}
                      loading={clockBusy}
                      onClick={() => void (timeData.current ? handleClockOut() : handleClockIn())}
                    >
                      {timeData.current ? "Clock out" : "Clock in"}
                    </Button>
                  </div>

                  {timeData.entries.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-border/60">
                      {timeData.entries.slice(0, 5).map((e, i) => (
                        <div
                          key={e.id}
                          className={`flex items-center justify-between px-3.5 py-2.5 text-sm ${
                            i > 0 ? "border-t border-border/50" : ""
                          }`}
                        >
                          <div>
                            <p className="font-medium text-foreground">{formatDate(e.clockInAt)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatTime(e.clockInAt)} → {e.clockOutAt ? formatTime(e.clockOutAt) : "—"}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-foreground">
                            {e.hoursWorked != null ? `${e.hoursWorked}h` : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No shifts recorded yet.</p>
                  )}
                </div>
              ) : null}
            </div>

            {/* Emergency contact */}
            {employee?.emergencyContact ? (
              <div className="mt-5">
                <h4 className="mb-2.5 text-sm font-semibold text-foreground">Emergency contact</h4>
                <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm">
                  <p className="font-medium text-foreground">{employee.emergencyContact.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {employee.emergencyContact.relation} · {employee.emergencyContact.phone}
                  </p>
                </div>
              </div>
            ) : null}

            {employee?.notes ? (
              <div className="mt-5">
                <h4 className="mb-2.5 text-sm font-semibold text-foreground">Notes</h4>
                <p className="rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                  {employee.notes}
                </p>
              </div>
            ) : null}
          </div>
        </ScrollArea>

        <SheetFooter className="border-t border-border/60 bg-card px-5 py-4">
          {employee ? (
            <Button className="w-full" variant="outline" onClick={() => onEdit(employee)}>
              <Pencil /> Edit profile
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

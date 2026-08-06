import { useEffect, useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import type { Employee, EmployeeStats } from "@/types";
import { formatCurrency, formatDate } from "@/utils/format";

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

/** Employee profile drawer with a live performance dashboard. */
export function EmployeeProfileDrawer({ open, onOpenChange, employee, onEdit }: EmployeeProfileDrawerProps) {
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [loading, setLoading] = useState(false);

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

            {/* Emergency contact */}
            {employee?.emergencyContact ? (
              <div className="mt-4">
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
              <div className="mt-4">
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

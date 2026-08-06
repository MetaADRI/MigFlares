import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  CalendarClock,
  CalendarOff,
  CircleX,
  HandCoins,
  Inbox,
  UserCheck,
  Wallet,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/status-badge";
import { dashboardService } from "@/services/dashboard.service";
import { PAYROLL_RUN_STATUS_META } from "@/constants";
import type { StaffSnapshot } from "@/types";
import { formatCurrency } from "@/utils/format";

function PanelSkeleton() {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] sm:p-6">
      <Skeleton className="h-5 w-36" />
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[64px]" />
        ))}
      </div>
      <Skeleton className="mt-4 h-16 w-full" />
    </div>
  );
}

/** Dashboard panel — today's attendance, pending leave, payday and the current run. */
export function StaffSnapshotPanel() {
  const [snapshot, setSnapshot] = useState<StaffSnapshot | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboardService
      .getStaffSnapshot()
      .then(setSnapshot)
      .catch(() => setError(true));
  }, []);

  if (error) return null;

  if (!snapshot) {
    return <PanelSkeleton />;
  }

  const att = snapshot.attendance;
  const stats = [
    { label: "Present", value: att.present, icon: UserCheck, accent: "bg-emerald-50 text-emerald-600" },
    { label: "Late", value: att.late, icon: CalendarClock, accent: "bg-amber-50 text-amber-600" },
    { label: "Absent", value: att.absent, icon: CircleX, accent: "bg-red-50 text-red-600" },
    { label: "On leave", value: att.onLeave, icon: CalendarOff, accent: "bg-violet-50 text-violet-600" },
  ];

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground">Staff &amp; payroll</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">Today at a glance</p>
        </div>
        <div className="grid size-9 place-items-center rounded-xl bg-orange-50 text-orange-600">
          <CalendarCheck className="size-4.5" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-background/60 px-3 py-2.5">
            <div className={`grid size-8 shrink-0 place-items-center rounded-lg ${s.accent}`}>
              <s.icon className="size-4" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <p className="font-display text-base font-bold leading-tight text-foreground">{s.value}</p>
              <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
        <Link
          to="/leave"
          className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5 transition-colors hover:bg-muted/50"
        >
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Inbox className="size-3.5" /> Pending leave
          </span>
          <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
            {snapshot.pendingLeave}
          </Badge>
        </Link>
        <Link
          to="/payroll"
          className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5 transition-colors hover:bg-muted/50"
        >
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wallet className="size-3.5" /> Payday
          </span>
          <span className="text-xs font-medium text-foreground">Day {snapshot.payday.payday}</span>
        </Link>
        <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <HandCoins className="size-3.5" /> Current run
          </span>
          {snapshot.currentRun ? (
            <StatusBadge meta={PAYROLL_RUN_STATUS_META[snapshot.currentRun.status]} />
          ) : (
            <span className="text-xs font-medium text-muted-foreground">—</span>
          )}
        </div>
      </div>

      {snapshot.payday.message ? (
        <p className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-2 text-xs text-orange-800">
          {snapshot.payday.message}
        </p>
      ) : null}
    </div>
  );
}

/** Compact card showing the current run's net total. */
export function CurrentRunCard({ snapshot }: { snapshot: StaffSnapshot | null }) {
  if (!snapshot?.currentRun) return null;
  const run = snapshot.currentRun;
  return (
    <Link
      to="/payroll"
      className="block rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {run.periodMonth} payroll
          </p>
          <p className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
            {formatCurrency(run.totalNet)}
          </p>
        </div>
        <StatusBadge meta={PAYROLL_RUN_STATUS_META[run.status]} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {run.payslipCount} payslips · {run.employeeCount} employees
      </p>
    </Link>
  );
}

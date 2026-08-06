import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarCheck2,
  Car,
  Clock3,
  Droplets,
  Hand,
  Loader2,
  Users,
  Wallet,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ActiveEmployees } from "@/components/dashboard/active-employees";
import { ExpenseSummary } from "@/components/dashboard/expense-summary";
import { InventoryAlerts } from "@/components/dashboard/inventory-alerts";
import { LatestReceipts } from "@/components/dashboard/latest-receipts";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { RecentCustomers } from "@/components/dashboard/recent-customers";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { ServiceDistribution } from "@/components/dashboard/service-distribution";
import { StaffSnapshotPanel } from "@/components/dashboard/staff-snapshot";
import { TopServices } from "@/components/dashboard/top-services";
import { StatCard } from "@/components/common/stat-card";
import { ErrorState } from "@/components/common/error-state";
import { useAuth } from "@/hooks/use-auth";
import { usePermission } from "@/context/permission-context";
import { dashboardService } from "@/services/dashboard.service";
import type { ActivityItem, Customer, DashboardInsights, DashboardStats, RevenuePoint, TopService } from "@/types";
import { formatCurrency } from "@/utils/format";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Animated waving-hand accent for the dashboard greeting. */
function WaveHand() {
  return (
    <motion.span
      className="ml-1.5 inline-flex shrink-0 text-orange-500"
      style={{ originX: 0.5, originY: 0.9 }}
      animate={{ rotate: [0, -16, 14, -10, 8, 0] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.5 }}
      aria-hidden
    >
      <Hand className="size-7" strokeWidth={2.2} />
    </motion.span>
  );
}

interface MiniStatProps {
  icon: typeof Droplets;
  label: string;
  value: string | number;
  accent?: string;
}

function MiniStat({ icon: Icon, label, value, accent }: MiniStatProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]"
    >
      <div className={`grid size-9 shrink-0 place-items-center rounded-lg ${accent ?? "bg-orange-50 text-orange-600"}`}>
        <Icon className="size-[18px]" strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <p className="font-display text-lg font-bold leading-tight text-foreground">{value}</p>
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { hasPermission } = usePermission();
  const navigate = useNavigate();

  const canSeeEmployees = hasPermission("employees:view");
  const canSeeInventory = hasPermission("inventory:view");
  const canSeeExpenses = hasPermission("expenses:view");
  const canSeeReceipts = hasPermission("receipts:view");
  const canSeeStaffPanel =
    hasPermission("attendance:view") || hasPermission("leave:view") || hasPermission("payroll:view");

  const [period, setPeriod] = useState<"week" | "month">("week");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [series, setSeries] = useState<RevenuePoint[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [topServices, setTopServices] = useState<TopService[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [insights, setInsights] = useState<DashboardInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [s, se, a, t, r, i] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getRevenueSeries(period),
        dashboardService.getActivities(),
        dashboardService.getTopServices(),
        dashboardService.getRecentCustomers(),
        dashboardService.getInsights(),
      ]);
      setStats(s);
      setSeries(se);
      setActivities(a);
      setTopServices(t);
      setRecentCustomers(r);
      setInsights(i);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  const firstName = user?.fullName.split(" ")[0] ?? "there";
  const todayLabel = new Date().toLocaleDateString("en-ZM", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (error) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card">
        <ErrorState message="We couldn't load your dashboard data." onRetry={() => void load()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
            {greeting()}, {firstName}
            <WaveHand />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{todayLabel}</p>
        </div>
        <Button size="lg" onClick={() => navigate("/wash-jobs?new=1")}>
          <Droplets /> New Wash Job
        </Button>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[124px]" />)
        ) : (
          <>
            <StatCard
              index={0}
              label="Today's Revenue"
              value={formatCurrency(stats.todayRevenue)}
              icon={Wallet}
              trend={stats.todayRevenueTrend}
              trendLabel="vs yesterday"
            />
            <StatCard
              index={1}
              label="Weekly Revenue"
              value={formatCurrency(stats.weeklyRevenue)}
              icon={CalendarCheck2}
              trend={stats.weeklyRevenueTrend}
              trendLabel="vs last week"
            />
            <StatCard
              index={2}
              label="Monthly Revenue"
              value={formatCurrency(stats.monthlyRevenue)}
              icon={Droplets}
              trend={stats.monthlyRevenueTrend}
              trendLabel="vs last month"
            />
            <StatCard
              index={3}
              label="Average Ticket"
              value={formatCurrency(stats.avgTicket)}
              icon={Clock3}
              trendLabel="per completed wash"
            />
          </>
        )}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {loading || !stats ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[72px]" />)
        ) : (
          <>
            <MiniStat icon={Car} label="Today's Cars" value={stats.todayCars} />
            <MiniStat
              icon={Clock3}
              label="Pending Washes"
              value={stats.pendingWashes}
              accent="bg-amber-50 text-amber-600"
            />
            <MiniStat
              icon={Droplets}
              label="In Progress"
              value={stats.inProgressWashes}
              accent="bg-sky-50 text-sky-600"
            />
            <MiniStat
              icon={CalendarCheck2}
              label="Completed"
              value={stats.completedWashes}
              accent="bg-emerald-50 text-emerald-600"
            />
            {canSeeEmployees ? (
              <MiniStat
                icon={Users}
                label="Employees Present"
                value={stats.employeesPresent}
                accent="bg-purple-50 text-purple-600"
              />
            ) : null}
          </>
        )}
      </div>

      {/* Chart + quick actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart
            series={series}
            period={period}
            onPeriodChange={setPeriod}
            loading={loading}
          />
        </div>
        <QuickActions />
      </div>

      {/* Activity + top services */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivity items={activities} loading={loading} />
        </div>
        <TopServices services={topServices} loading={loading} />
      </div>

      {/* Operational snapshot: alerts, expenses, receipts */}
      {canSeeInventory || canSeeExpenses || canSeeReceipts ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {canSeeInventory ? <InventoryAlerts alerts={insights?.inventoryAlerts ?? []} loading={loading} /> : null}
          {canSeeExpenses ? <ExpenseSummary summary={insights?.expenseSummary ?? null} loading={loading} /> : null}
          {canSeeReceipts ? <LatestReceipts receipts={insights?.latestReceipts ?? []} loading={loading} /> : null}
        </div>
      ) : null}

      {/* Staff & payroll snapshot */}
      {canSeeStaffPanel ? <StaffSnapshotPanel /> : null}

      {/* Service distribution + active employees */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={canSeeEmployees ? "" : "lg:col-span-2"}>
          <ServiceDistribution services={insights?.serviceDistribution ?? []} loading={loading} />
        </div>
        {canSeeEmployees ? (
          <ActiveEmployees employees={insights?.activeEmployees ?? []} loading={loading} />
        ) : null}
      </div>

      {/* Recent customers */}
      <RecentCustomers customers={recentCustomers} loading={loading} />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Refreshing…
        </div>
      ) : null}
    </div>
  );
}

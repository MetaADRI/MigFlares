import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Car,
  Clock,
  DollarSign,
  Gauge,
  Percent,
  ReceiptText,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ErrorState } from "@/components/common/error-state";
import { StatCard } from "@/components/common/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { analyticsService } from "@/services/analytics.service";
import type { AnalyticsOverview } from "@/types";
import { formatCompactCurrency, formatCurrency } from "@/utils/format";

const ORANGE = "#F47B20";
const COLORS = ["#F47B20", "#191919", "#0EA5E9", "#10B981", "#8B5CF6", "#F59E0B"];

const axis = { fontSize: 11, fill: "var(--muted-foreground)" };

function ChartTooltip({ active, payload, label, currency = true }: { active?: boolean; payload?: { payload: { value: number } }[]; label?: string; currency?: boolean }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/70 bg-card px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="font-display text-sm font-bold text-foreground">
        {currency ? formatCurrency(payload[0].payload.value) : payload[0].payload.value}
      </p>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    analyticsService
      .getOverview()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" description="Executive performance overview." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-border/70 bg-card" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-2xl border border-border/70 bg-card" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" description="Executive performance overview.">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw /> Retry
          </Button>
        </PageHeader>
        <ErrorState message="Could not load analytics. Please try again." onRetry={load} />
      </div>
    );
  }

  const k = data.kpis;
  const profitPositive = k.monthlyProfit >= 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Executive overview of performance, growth and efficiency.">
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw /> Refresh
        </Button>
      </PageHeader>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Monthly revenue" value={formatCurrency(k.monthlyRevenue)} icon={DollarSign} trend={k.monthlyGrowth} trendLabel="vs last month" index={0} />
        <StatCard label="Avg ticket size" value={formatCurrency(k.avgTicket)} icon={ReceiptText} index={1} />
        <StatCard label="Cars per day" value={String(k.carsPerDay)} icon={Car} index={2} />
        <StatCard label="Avg wash time" value={`${k.avgWashTimeMin} min`} icon={Clock} index={3} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue growth" value={`${k.revenueGrowth}%`} icon={TrendingUp} index={4} />
        <StatCard label="Monthly profit" value={formatCurrency(k.monthlyProfit)} icon={Gauge} index={5} />
        <StatCard label="Today's revenue" value={formatCurrency(k.todayRevenue)} icon={Activity} index={6} />
        <StatCard label="Retention rate" value={`${data.retention.retentionRate}%`} icon={Percent} index={7} />
      </div>

      {/* Revenue / profit trend */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Revenue & profit · last 30 days</CardTitle>
            <span className="text-xs text-muted-foreground">Kwacha (ZMW)</span>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ORANGE} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={ORANGE} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={axis} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => formatCompactCurrency(v)} />
                <Tooltip
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div className="rounded-xl border border-border/70 bg-card px-3.5 py-2.5 shadow-lg">
                        <p className="text-xs font-medium text-muted-foreground">{label}</p>
                        {payload.map((p) => (
                          <p key={String(p.dataKey)} className="text-xs text-foreground">
                            <span className="capitalize">{String(p.dataKey)}:</span>{" "}
                            <span className="font-semibold">{formatCurrency(Number(p.value))}</span>
                          </p>
                        ))}
                      </div>
                    ) : null
                  }
                  cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }}
                />
                <Area type="monotone" dataKey="revenue" name="revenue" stroke={ORANGE} strokeWidth={2.5} fill="url(#revGrad)" />
                <Area type="monotone" dataKey="profit" name="profit" stroke="#10B981" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Grid: popular services + peak hours */}
      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Most popular services</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={data.popularServices} dataKey="count" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3} stroke="var(--card)">
                    {data.popularServices.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="rounded-xl border border-border/70 bg-card px-3 py-2 text-xs shadow-lg">
                          <p className="font-medium text-foreground">{payload[0].name}</p>
                          <p className="text-muted-foreground">{payload[0].value} washes</p>
                        </div>
                      ) : null
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {data.popularServices.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <span className="truncate text-muted-foreground">{s.name}</span>
                    <span className="font-semibold text-foreground">
                      {s.count} · {formatCurrency(s.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Peak business hours</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.peakHours} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="hour" tick={{ ...axis, fontSize: 9 }} tickLine={false} axisLine={false} interval={2} />
                  <YAxis tick={axis} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip currency={false} />} cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="value" fill={ORANGE} radius={[4, 4, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
              <p className="mt-2 text-xs text-muted-foreground">
                Busiest window:{" "}
                <span className="font-semibold text-foreground">
                  {[...data.peakHours].sort((a, b) => b.value - a.value)[0]?.hour}
                </span>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Grid: retention + expense trends */}
      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Customer retention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="font-display text-xl font-bold text-foreground">{data.retention.totalCustomers}</p>
                  <p className="text-[11px] text-muted-foreground">Total customers</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="font-display text-xl font-bold text-foreground">{data.retention.returningCustomers}</p>
                  <p className="text-[11px] text-muted-foreground">Returning</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="font-display text-xl font-bold text-foreground">{data.retention.repeatCustomers}</p>
                  <p className="text-[11px] text-muted-foreground">Repeat</p>
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Retention rate</span>
                  <span className="font-semibold text-foreground">{data.retention.retentionRate}%</span>
                </div>
                <Progress value={data.retention.retentionRate} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Expense trends · 6 months</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.expenseTrends} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
                  <YAxis tick={axis} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => formatCompactCurrency(v)} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }} />
                  <Line type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Grid: employee productivity + top customers */}
      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Employee productivity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.employeeProductivity.map((e) => {
                  const max = Math.max(1, ...data.employeeProductivity.map((x) => x.washes));
                  return (
                    <div key={e.label}>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 font-medium text-foreground">
                          <Users className="size-3.5 text-muted-foreground" /> {e.label}
                        </span>
                        <span className="text-muted-foreground">
                          {e.washes} washes · <span className="font-semibold text-foreground">{formatCurrency(e.revenue)}</span>
                        </span>
                      </div>
                      <Progress value={(e.washes / max) * 100} className="h-1.5" indicatorClassName="bg-primary" />
                    </div>
                  );
                })}
                {data.employeeProductivity.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No wash activity yet.</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Top customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.topCustomers.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-orange-50 text-xs font-bold text-orange-600">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.visits} visits</p>
                    </div>
                    <span className="font-display text-sm font-bold text-foreground">{formatCurrency(c.total)}</span>
                  </div>
                ))}
                {data.topCustomers.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No customer activity yet.</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom summary strip */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="grid gap-3 rounded-2xl border border-border/70 bg-card p-5 text-sm sm:grid-cols-3 xl:grid-cols-6"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Receipts issued</p>
          <p className="mt-1 font-display text-lg font-bold text-foreground">{data.summary.receiptsIssued}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Receipts voided</p>
          <p className="mt-1 font-display text-lg font-bold text-destructive">{data.summary.receiptsVoided}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active employees</p>
          <p className="mt-1 font-display text-lg font-bold text-foreground">{data.summary.activeEmployees}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active services</p>
          <p className="mt-1 font-display text-lg font-bold text-foreground">{data.summary.activeServices}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total washes</p>
          <p className="mt-1 font-display text-lg font-bold text-foreground">{data.summary.totalWashes}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Monthly profit</p>
          <p className={profitPositive ? "mt-1 font-display text-lg font-bold text-emerald-600" : "mt-1 font-display text-lg font-bold text-destructive"}>
            {formatCurrency(k.monthlyProfit)}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

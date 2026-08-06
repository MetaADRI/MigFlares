import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RevenuePoint } from "@/types";
import { formatCompactCurrency, formatCurrency } from "@/utils/format";

interface ChartTooltipProps {
  active?: boolean;
  label?: string;
  payload?: { payload: RevenuePoint }[];
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-xl border border-border/70 bg-card px-3.5 py-2.5 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-base font-bold text-foreground">
        {formatCurrency(point.revenue)}
      </p>
      <p className="text-xs text-muted-foreground">
        {point.cars} car{point.cars === 1 ? "" : "s"}
      </p>
    </div>
  );
}

interface RevenueChartProps {
  series: RevenuePoint[];
  period: "week" | "month";
  onPeriodChange: (period: "week" | "month") => void;
  loading?: boolean;
}

export function RevenueChart({ series, period, onPeriodChange, loading }: RevenueChartProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
            Revenue
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {period === "week" ? "Last 7 days" : "Last 30 days"} · completed washes
          </p>
        </div>
        <Tabs value={period} onValueChange={(v) => onPeriodChange(v as "week" | "month")}>
          <TabsList className="h-8">
            <TabsTrigger value="week" className="px-2.5 py-1 text-xs">
              Week
            </TabsTrigger>
            <TabsTrigger value="month" className="px-2.5 py-1 text-xs">
              Month
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-4 flex-1">
        {loading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F47B20" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#F47B20" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={(v: number) => formatCompactCurrency(v)}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#F47B20"
                strokeWidth={2.5}
                fill="url(#revenueFill)"
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

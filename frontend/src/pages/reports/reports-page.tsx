import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Download, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CURRENCY, REPORT_PERIODS, REPORT_TYPES } from "@/constants";
import { reportsService } from "@/services/reports.service";
import type { ReportPeriod, ReportResult, ReportType } from "@/types";
import { cn } from "@/utils/cn";
import { formatCurrency, formatDate } from "@/utils/format";
import { printReport as printReportDoc } from "@/utils/report-print";

const CHART_COLORS = ["#F47B20", "#191919", "#0EA5E9", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#14B8A6"];

const kindValue = (kind: "currency" | "number" | "percent", value: number) =>
  kind === "currency" ? formatCurrency(value) : kind === "percent" ? `${value}%` : value.toLocaleString();

function ReportChart({ result }: { result: ReportResult }) {
  const meta = REPORT_TYPES.find((r) => r.value === result.type);

  const common = { fontSize: 11, fill: "var(--muted-foreground)" };
  const grid = <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />;

  if (meta?.chart === "pie") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={result.series}
            dataKey="value"
            nameKey="label"
            innerRadius={62}
            outerRadius={100}
            paddingAngle={3}
            stroke="var(--card)"
          >
            {result.series.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="rounded-xl border border-border/70 bg-card px-3 py-2 text-xs shadow-lg">
                  <p className="font-medium text-foreground">{payload[0].name}</p>
                  <p className="text-muted-foreground">{formatCurrency(Number(payload[0].value))}</p>
                </div>
              ) : null
            }
          />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (meta?.chart === "bar") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={result.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          {grid}
          <XAxis dataKey="label" tick={common} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={common} tickLine={false} axisLine={false} width={48} />
          <Tooltip content={<SeriesTooltip />} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="value" fill="#F47B20" radius={[6, 6, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (meta?.chart === "line") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={result.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          {grid}
          <XAxis dataKey="label" tick={common} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={common} tickLine={false} axisLine={false} width={48} />
          <Tooltip content={<SeriesTooltip />} cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }} />
          <Line type="monotone" dataKey="value" stroke="#F47B20" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // area (default)
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={result.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="reportFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F47B20" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#F47B20" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {grid}
        <XAxis dataKey="label" tick={common} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={common} tickLine={false} axisLine={false} width={48} />
        <Tooltip content={<SeriesTooltip />} cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }} />
        <Area type="monotone" dataKey="value" stroke="#F47B20" strokeWidth={2.5} fill="url(#reportFill)" activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function SeriesTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: { value: number; secondary?: number } }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-xl border border-border/70 bg-card px-3.5 py-2.5 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-sm font-bold text-foreground">{formatCurrency(point.value)}</p>
      {point.secondary !== undefined ? (
        <p className="text-xs text-muted-foreground">{point.secondary} washes</p>
      ) : null}
    </div>
  );
}

export default function ReportsPage() {
  const [type, setType] = useState<ReportType>("REVENUE");
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const meta = REPORT_TYPES.find((r) => r.value === type)!;

  const load = useCallback(
    async (queryType: ReportType, queryPeriod: ReportPeriod, f: string, t: string) => {
      setLoading(true);
      setError(false);
      try {
        const res = await reportsService.generate({
          type: queryType,
          period: queryPeriod,
          ...(queryPeriod === "custom" ? { from: f || undefined, to: t || undefined } : {}),
        });
        setResult(res);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(type, period, from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, period]);

  const summaryCards = useMemo(() => result?.summary ?? [], [result]);

  const exportCsv = async () => {
    try {
      await reportsService.exportCsv({ type, period, ...(period === "custom" ? { from, to } : {}) });
      toast.success("Report exported as CSV");
    } catch {
      toast.error("Could not export the report");
    }
  };

  const printReport = () => {
    if (!result) {
      toast.error("Generate the report first");
      return;
    }
    printReportDoc(result);
  };

  const changeType = (value: string) => {
    setType(value as ReportType);
  };

  const changePeriod = (value: string) => {
    setPeriod(value as ReportPeriod);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Business summaries derived from live operational data.">
        <Button variant="outline" size="sm" onClick={printReport}>
          <Printer /> Print
        </Button>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download /> CSV
        </Button>
        <Button variant="outline" size="sm" disabled>
          <FileText /> Excel
        </Button>
      </PageHeader>

      {/* Controls */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] lg:flex-row lg:items-center">
        <div className="flex flex-1 flex-wrap gap-2">
          {REPORT_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => changeType(t.value)}
              className={cn(
                "rounded-xl border px-3.5 py-2 text-sm font-medium transition-all duration-200",
                type === t.value
                  ? "border-orange-200 bg-orange-50 text-orange-700 shadow-sm"
                  : "border-border/70 bg-background text-muted-foreground hover:border-orange-200 hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={changePeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {period === "custom" ? (
            <>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9.5 rounded-xl border border-border/70 bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-9.5 rounded-xl border border-border/70 bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
              <Button size="sm" onClick={() => void load(type, period, from, to)}>
                Apply
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {/* Period label + description */}
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">{meta.label}</h3>
          <p className="text-sm text-muted-foreground">{meta.description}</p>
        </div>
        {result ? <p className="text-sm font-medium text-muted-foreground">{result.periodLabel}</p> : null}
      </div>

      {loading ? (
        <LoadingState label="Generating report…" />
      ) : error ? (
        <ErrorState message="Could not generate this report. Try a different period." onRetry={() => void load(type, period, from, to)} />
      ) : result ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6">
          {/* Summary cards */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</p>
                <p className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground">
                  {kindValue(card.kind, card.value)}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Chart */}
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="font-display text-sm font-semibold text-foreground">Trend</h4>
              <Badge variant="secondary" className="capitalize">
                {meta.chart}
              </Badge>
            </div>
            <ReportChart result={result} />
          </div>

          {/* Table */}
          {result.table.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(result.table[0]).map((key) => (
                        <TableHead key={key} className="whitespace-nowrap capitalize">
                          {key.replace(/([A-Z])/g, " $1")}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.table.map((row, i) => (
                      <TableRow key={i}>
                        {Object.entries(row).map(([key, value]) => (
                          <TableCell key={key} className="whitespace-nowrap">
                            {key.includes("total") || key.includes("revenue") || key === "amount" || key.includes("value") ? (
                              <span className="font-medium">{formatCurrency(Number(value ?? 0))}</span>
                            ) : key === "date" || key.includes("Wash") || key === "lastVisit" || key === "lastWash" || key === "issuedAt" ? (
                              <span>{formatDate(String(value ?? ""))}</span>
                            ) : (
                              <span>{String(value ?? "—")}</span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between border-t border-border/60 px-5 py-3 text-xs text-muted-foreground">
                <span>
                  {result.table.length} row{result.table.length === 1 ? "" : "s"} · {CURRENCY.code}
                </span>
                <span className="font-medium text-primary">Export for accounting</span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 py-12 text-center text-sm text-muted-foreground">
              No data for this period — try a wider range.
            </div>
          )}
        </motion.div>
      ) : null}
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Banknote, HandCoins, PlusCircle, Settings2, Wallet } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { usePermission } from "@/context/permission-context";
import { payrollService } from "@/services/payroll.service";
import {
  ATTENDANCE_MONTHS,
  PAYMENT_METHODS,
  PAYROLL_RUN_STATUS_META,
  PAYSLIP_STATUS_META,
} from "@/constants";
import type { Paginated } from "@/types/api";
import type { PaydayReminder, PayrollRun, PayrollRule, Payslip } from "@/types";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { payslipAdjustSchema, payrollRuleSchema, type PayrollRuleInput, type PayslipAdjustInput } from "@/utils/validation";

const PAGE_SIZE = 10;

const DEDUCTION_FIELDS: { key: keyof NonNullable<PayrollRule["deductions"]>; label: string }[] = [
  { key: "loan", label: "Loan recovery" },
  { key: "damages", label: "Damages" },
  { key: "uniform", label: "Uniform" },
  { key: "transport", label: "Transport" },
  { key: "meals", label: "Meals" },
  { key: "advances", label: "Advances" },
  { key: "other", label: "Other" },
];

export default function PayrollPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission("payroll:manage");

  const [rule, setRule] = useState<PayrollRule | null>(null);
  const [reminder, setReminder] = useState<PaydayReminder | null>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<PayrollRun> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [generateMonth, setGenerateMonth] = useState(ATTENDANCE_MONTHS[0]?.value ?? "");
  const [generating, setGenerating] = useState(false);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [viewing, setViewing] = useState<PayrollRun | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    payrollService
      .listRuns({ page, pageSize: PAGE_SIZE })
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
  }, [page, refreshKey]);

  useEffect(() => {
    payrollService
      .getRule()
      .then(setRule)
      .catch(() => undefined);
    payrollService
      .getPaydayReminders()
      .then(setReminder)
      .catch(() => undefined);
  }, [refreshKey]);

  useEffect(() => {
    return load();
  }, [load]);

  const generate = async () => {
    if (!generateMonth) return;
    setGenerating(true);
    try {
      await payrollService.generate(generateMonth);
      toast.success("Payroll run generated");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate run");
    } finally {
      setGenerating(false);
    }
  };

  const process = async (run: PayrollRun) => {
    setBusy(true);
    try {
      await payrollService.processRun(run.id);
      toast.success("Run processed");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to process run");
    } finally {
      setBusy(false);
    }
  };

  const isEmpty = !loading && !error && data?.total === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description="Run generation, payslips and payday tracking."
      >
        {canManage ? (
          <Button variant="outline" onClick={() => setRuleOpen(true)}>
            <Settings2 /> Payroll rule
          </Button>
        ) : null}
      </PageHeader>

      {reminder?.message ? (
        <div className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <Wallet className="size-4 shrink-0" />
          <span>{reminder.message}</span>
        </div>
      ) : null}

      {/* Rule summary */}
      {rule ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <RuleCard label="Payday" value={rule.defaultPayday ? `Day ${rule.defaultPayday}` : "—"} />
          <RuleCard label="Start time" value={rule.startTime} />
          <RuleCard label="Overtime rate" value={`×${Number(rule.overtimeRate).toFixed(2)}`} />
          <RuleCard label="Standard day" value={`${rule.standardMinutesPerDay} min`} />
        </div>
      ) : null}

      {/* Generate + list */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Select value={generateMonth} onValueChange={setGenerateMonth}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              {ATTENDANCE_MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManage ? (
            <Button onClick={() => void generate()} loading={generating}>
              <PlusCircle /> Generate run
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
        {error ? (
          <ErrorState onRetry={() => setRefreshKey((k) => k + 1)} />
        ) : loading ? (
          <LoadingState label="Loading payroll runs…" />
        ) : isEmpty ? (
          <EmptyState
            icon={HandCoins}
            title="No payroll runs yet"
            description="Generate a run for a month to see payslips here."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Payslips</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium text-foreground">{run.periodMonth}</TableCell>
                    <TableCell>
                      <StatusBadge meta={PAYROLL_RUN_STATUS_META[run.status]} />
                    </TableCell>
                    <TableCell>{run.employeeCount}</TableCell>
                    <TableCell>{run.payslipCount ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(run.totalGross)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(run.totalDeductions)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground">
                      {formatCurrency(run.totalNet)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => setViewing(run)}>
                          View
                        </Button>
                        {canManage && run.status === "DRAFT" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={busy}
                            onClick={() => void process(run)}
                          >
                            Process
                          </Button>
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

      {canManage && rule ? (
        <RuleDialog
          open={ruleOpen}
          onOpenChange={setRuleOpen}
          rule={rule}
          onSaved={(saved) => {
            setRule(saved);
            setRuleOpen(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      ) : null}

      <RunDialog
        run={viewing}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
        onChanged={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}

function RuleCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function RuleDialog({
  open,
  onOpenChange,
  rule,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: PayrollRule;
  onSaved: (rule: PayrollRule) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PayrollRuleInput>({
    resolver: zodResolver(payrollRuleSchema),
    defaultValues: {
      name: "",
      startTime: "08:00",
      graceMinutes: 15,
      standardMinutesPerDay: 480,
      overtimeRate: 1.5,
      dailyOvertimeThresholdMin: 600,
      defaultPayday: 25,
      bonusEnabled: true,
      overtimeEnabled: true,
      allowancesEnabled: true,
      deductionLoan: 0,
      deductionDamages: 0,
      deductionUniform: 0,
      deductionTransport: 0,
      deductionMeals: 0,
      deductionAdvances: 0,
      deductionOther: 0,
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: rule.name,
        startTime: rule.startTime,
        graceMinutes: rule.graceMinutes,
        standardMinutesPerDay: rule.standardMinutesPerDay,
        overtimeRate: Number(rule.overtimeRate),
        dailyOvertimeThresholdMin: rule.dailyOvertimeThresholdMin,
        defaultPayday: rule.defaultPayday,
        bonusEnabled: rule.bonusEnabled,
        overtimeEnabled: rule.overtimeEnabled,
        allowancesEnabled: rule.allowancesEnabled,
        deductionLoan: rule.deductions.loan,
        deductionDamages: rule.deductions.damages,
        deductionUniform: rule.deductions.uniform,
        deductionTransport: rule.deductions.transport,
        deductionMeals: rule.deductions.meals,
        deductionAdvances: rule.deductions.advances,
        deductionOther: rule.deductions.other,
        notes: rule.notes ?? "",
      });
    }
  }, [open, rule, reset]);

  const onSubmit = async (values: PayrollRuleInput) => {
    setSubmitting(true);
    try {
      const saved = await payrollService.updateRule(values);
      toast.success("Payroll rule saved");
      onSaved(saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save rule");
    } finally {
      setSubmitting(false);
    }
  };

  const toggles: { key: "bonusEnabled" | "overtimeEnabled" | "allowancesEnabled"; label: string }[] = [
    { key: "bonusEnabled", label: "Performance bonus" },
    { key: "overtimeEnabled", label: "Overtime pay" },
    { key: "allowancesEnabled", label: "Allowances" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payroll rule</DialogTitle>
          <DialogDescription>
            Global settings for this branch — used by attendance classification and every payroll run.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label>Rule name</Label>
            <Input placeholder="e.g. Standard shift" {...register("name")} />
            {errors.name?.message ? <p className="text-xs text-red-500">{errors.name.message}</p> : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Start time</Label>
              <Input type="time" {...register("startTime")} />
              {errors.startTime?.message ? <p className="text-xs text-red-500">{errors.startTime.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Grace (minutes)</Label>
              <Input type="number" min={0} max={120} {...register("graceMinutes")} />
            </div>
            <div className="space-y-1.5">
              <Label>Standard day (minutes)</Label>
              <Input type="number" min={60} max={720} {...register("standardMinutesPerDay")} />
            </div>
            <div className="space-y-1.5">
              <Label>Overtime rate (×)</Label>
              <Input type="number" min={1} max={3} step="0.05" {...register("overtimeRate")} />
            </div>
            <div className="space-y-1.5">
              <Label>OT threshold (minutes)</Label>
              <Input type="number" min={360} max={960} {...register("dailyOvertimeThresholdMin")} />
            </div>
            <div className="space-y-1.5">
              <Label>Payday (day of month)</Label>
              <Input type="number" min={1} max={28} {...register("defaultPayday")} />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border/70 bg-muted/30 p-4">
            <div>
              <Label>Components</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">Toggle what is included in net pay.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {toggles.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2.5">
                  <Label className="text-sm font-medium">{label}</Label>
                  <Switch checked={watch(key)} onCheckedChange={(checked) => setValue(key, checked)} />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border/70 bg-muted/30 p-4">
            <div>
              <Label>Deductions (ZMW / month)</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Applied to every payslip in this branch.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {DEDUCTION_FIELDS.map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs">{label}</Label>
                  <Input type="number" min={0} step="0.5" {...register(`deduction${capitalize(key)}` as "deductionLoan")} />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea placeholder="Optional notes" rows={2} {...register("notes")} />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save rule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function RunDialog({
  run,
  onOpenChange,
  onChanged,
}: {
  run: PayrollRun | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const { hasPermission } = usePermission();
  const canManage = hasPermission("payroll:manage");
  const [detail, setDetail] = useState<PayrollRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [payMethod, setPayMethod] = useState("CASH");
  const [payingRun, setPayingRun] = useState(false);
  const [adjusting, setAdjusting] = useState<Payslip | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (run) {
      setLoading(true);
      payrollService
        .getRun(run.id)
        .then(setDetail)
        .catch(() => undefined)
        .finally(() => setLoading(false));
    } else {
      setDetail(null);
    }
  }, [run]);

  const markRunPaid = async () => {
    if (!detail) return;
    setPayingRun(true);
    try {
      await payrollService.markRunPaid(detail.id, payMethod);
      toast.success("Run marked as paid");
      onOpenChange(false);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark paid");
    } finally {
      setPayingRun(false);
    }
  };

  const markPayslipPaid = async (slip: Payslip) => {
    setBusy(true);
    try {
      await payrollService.markPayslipPaid(slip.id, payMethod);
      toast.success("Payslip marked as paid");
      onChanged();
      const refreshed = await payrollService.getRun(detail!.id);
      setDetail(refreshed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark payslip paid");
    } finally {
      setBusy(false);
    }
  };

  const slips = detail?.payslips ?? [];

  return (
    <>
      <Dialog open={Boolean(run)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payroll run — {detail?.periodMonth ?? "…"}</DialogTitle>
          <DialogDescription>
            {detail ? (
              <span className="flex items-center gap-2">
                <StatusBadge meta={PAYROLL_RUN_STATUS_META[detail.status]} />
                <span>Net total {formatCurrency(detail.totalNet)}</span>
              </span>
            ) : (
              "Loading…"
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <LoadingState label="Loading payslips…" />
        ) : (
          <>
            {detail && detail.status === "PROCESSED" && canManage ? (
              <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/30 p-3 sm:flex-row sm:items-center">
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => void markRunPaid()} loading={payingRun} className="sm:ml-auto">
                  <Banknote /> Mark entire run paid
                </Button>
              </div>
            ) : null}

            {slips.length === 0 ? (
              <EmptyState icon={HandCoins} title="No payslips" description="This run has no payslips yet." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slips.map((slip) => (
                    <TableRow key={slip.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {slip.employee ? `${slip.employee.firstName} ${slip.employee.lastName}` : "—"}
                        </div>
                        {slip.employee ? (
                          <div className="text-xs text-muted-foreground">{slip.employee.position}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(slip.grossAmount)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(slip.totalDeductions)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground">
                        {formatCurrency(slip.netAmount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge meta={PAYSLIP_STATUS_META[slip.status]} />
                      </TableCell>
                      <TableCell className="text-right">
                        {canManage ? (
                          <div className="flex justify-end gap-1.5">
                            <Button variant="ghost" size="sm" onClick={() => setAdjusting(slip)}>
                              Adjust
                            </Button>
                            {slip.status === "DRAFT" && detail?.status === "PROCESSED" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                loading={busy}
                                onClick={() => void markPayslipPaid(slip)}
                              >
                                Mark paid
                              </Button>
                            ) : null}
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}

        {detail && detail.status === "PROCESSED" ? (
          <p className="text-xs text-muted-foreground">
            Processed {detail.processedAt ? formatDateTime(detail.processedAt) : "—"}
            {detail.paidAt ? ` · Paid ${formatDateTime(detail.paidAt)}` : ""}
          </p>
        ) : null}
      </DialogContent>
      </Dialog>

      {adjusting ? (
        <AdjustDialog
          slip={adjusting}
          onOpenChange={(open) => {
            if (!open) setAdjusting(null);
          }}
          onSaved={async () => {
            setAdjusting(null);
            onChanged();
            const refreshed = await payrollService.getRun(detail!.id);
            setDetail(refreshed);
          }}
        />
      ) : null}
    </>
  );
}

function AdjustDialog({
  slip,
  onOpenChange,
  onSaved,
}: {
  slip: Payslip;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PayslipAdjustInput>({
    resolver: zodResolver(payslipAdjustSchema),
    defaultValues: {
      overtimeHours: slip.overtimeHours,
      overtimeAmount: slip.overtimeAmount,
      bonusAmount: slip.bonusAmount,
      allowancesAmount: slip.allowancesAmount,
      deductionLoan: slip.deductions.loan,
      deductionDamages: slip.deductions.damages,
      deductionUniform: slip.deductions.uniform,
      deductionTransport: slip.deductions.transport,
      deductionMeals: slip.deductions.meals,
      deductionAdvances: slip.deductions.advances,
      deductionOther: slip.deductions.other,
      notes: slip.notes ?? "",
    },
  });

  const onSubmit = async (values: PayslipAdjustInput) => {
    setSubmitting(true);
    try {
      await payrollService.adjustPayslip(slip.id, values);
      toast.success("Payslip updated");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update payslip");
    } finally {
      setSubmitting(false);
    }
  };

  const numericFields: { key: string; label: string }[] = [
    { key: "overtimeHours", label: "OT hours" },
    { key: "overtimeAmount", label: "OT amount" },
    { key: "bonusAmount", label: "Bonus" },
    { key: "allowancesAmount", label: "Allowances" },
    { key: "deductionLoan", label: "Deduction — loan" },
    { key: "deductionDamages", label: "Deduction — damages" },
    { key: "deductionUniform", label: "Deduction — uniform" },
    { key: "deductionTransport", label: "Deduction — transport" },
    { key: "deductionMeals", label: "Deduction — meals" },
    { key: "deductionAdvances", label: "Deduction — advances" },
    { key: "deductionOther", label: "Deduction — other" },
  ];

  return (
    <Dialog open={Boolean(slip)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust payslip</DialogTitle>
          <DialogDescription>
            {slip.employee ? `${slip.employee.firstName} ${slip.employee.lastName}` : "Payslip"} —{" "}
            {slip.periodMonth}. Leave blank to keep current values.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          {numericFields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-xs">{f.label}</Label>
              <Input type="number" min={0} step="0.5" {...register(f.key as never)} />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea placeholder="Why was this adjusted?" rows={2} {...register("notes")} />
          </div>
          {Object.values(errors).map((e, i) =>
            e?.message ? (
              <p key={i} className="text-xs text-red-500">
                {String(e.message)}
              </p>
            ) : null,
          )}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save adjustments
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

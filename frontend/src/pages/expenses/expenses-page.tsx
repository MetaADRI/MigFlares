import { useCallback, useEffect, useState } from "react";
import {
  Banknote,
  CalendarDays,
  Download,
  Hourglass,
  Plus,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PaginationBar } from "@/components/common/pagination-bar";
import { SearchInput } from "@/components/common/search-input";
import { StatCard } from "@/components/common/stat-card";
import { ExpenseModal } from "@/components/expenses/expense-modal";
import { ExpenseTable } from "@/components/expenses/expense-table";
import { useDebounce } from "@/hooks/use-debounce";
import { expensesService } from "@/services/expenses.service";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABEL, EXPENSE_STATUS_META, PAYMENT_METHOD_LABEL } from "@/constants";
import type { Paginated } from "@/types/api";
import type { Expense, ExpenseStats } from "@/types";
import { downloadCsv } from "@/utils/export";
import { formatCurrency, formatDate } from "@/utils/format";

const PAGE_SIZE = 10;

export default function ExpensesPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [month, setMonth] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("expenseDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Expense> | null>(null);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    expensesService
      .list({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        month: month || undefined,
        category: category === "all" ? undefined : category,
        status: status === "all" ? undefined : status,
        sortBy,
        sortDir,
      })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load expenses");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, month, category, status, sortBy, sortDir, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, month, category, status, sortBy, sortDir]);

  useEffect(() => {
    return load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    expensesService
      .getStats()
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("desc");
    }
  };

  const handleSaved = () => setRefreshKey((k) => k + 1);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleApprove = async (expense: Expense) => {
    try {
      await expensesService.setStatus(expense.id, "APPROVED");
      toast.success("Expense approved");
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error("Failed to approve expense");
    }
  };

  const handleReject = async (expense: Expense) => {
    try {
      await expensesService.setStatus(expense.id, "REJECTED");
      toast.success("Expense rejected");
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error("Failed to reject expense");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await expensesService.remove(deleteTarget.id);
      toast.success("Expense deleted");
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error("Failed to delete expense");
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const rows = await expensesService.exportAll({
        search: debouncedSearch,
        month: month || undefined,
        category: category === "all" ? undefined : category,
        status: status === "all" ? undefined : status,
      });
      downloadCsv(
        `expenses-${new Date().toISOString().slice(0, 10)}.csv`,
        ["Date", "Category", "Vendor", "Description", "Payment Method", "Status", "Amount (ZMW)", "Recorded By"],
        rows.map((e) => [
          formatDate(e.expenseDate),
          EXPENSE_CATEGORY_LABEL[e.category],
          e.vendor ?? "",
          e.description ?? "",
          PAYMENT_METHOD_LABEL[e.paymentMethod],
          EXPENSE_STATUS_META[e.status].label,
          e.amount.toFixed(2),
          e.createdByName ?? "",
        ]),
      );
      toast.success(`Exported ${rows.length} expense${rows.length === 1 ? "" : "s"}`);
    } catch {
      toast.error("Failed to export expenses");
    } finally {
      setExporting(false);
    }
  };

  const isEmpty = !loading && data?.total === 0 && !debouncedSearch && !month && category === "all" && status === "all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Track every outflow — from rent to cleaning chemicals — with an approval flow."
      >
        <Button variant="outline" onClick={() => void handleExport()} loading={exporting}>
          <Download /> Export CSV
        </Button>
        <Button onClick={openCreate}>
          <Plus /> Record Expense
        </Button>
      </PageHeader>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Monthly expenses"
          value={formatCurrency(stats?.monthlyExpenses ?? 0)}
          icon={Wallet}
          iconClassName="bg-orange-50 text-orange-600"
          index={0}
        />
        <StatCard
          label="Today's expenses"
          value={formatCurrency(stats?.todayExpenses ?? 0)}
          icon={CalendarDays}
          iconClassName="bg-sky-50 text-sky-600"
          index={1}
        />
        <StatCard
          label="Pending approvals"
          value={String(stats?.pendingApprovals ?? 0)}
          icon={Hourglass}
          iconClassName="bg-amber-50 text-amber-600"
          index={2}
        />
        <StatCard
          label="Largest expense (mo)"
          value={stats?.largestExpense ? formatCurrency(stats.largestExpense.amount) : "—"}
          icon={TrendingUp}
          iconClassName="bg-red-50 text-red-600"
          index={3}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search vendor or description…"
          className="w-full sm:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-10 rounded-xl border border-border/70 bg-card px-3 text-sm shadow-sm outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            aria-label="Filter by month"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
          {month || category !== "all" || status !== "all" || debouncedSearch ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMonth("");
                setCategory("all");
                setStatus("all");
                setSearch("");
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
        <div className="lg:ml-auto">
          <Select value={sortBy} onValueChange={(v) => handleSort(v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expenseDate">Date</SelectItem>
              <SelectItem value="amount">Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border/70 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
        {isEmpty ? (
          <EmptyState
            icon={Banknote}
            title="No expenses yet"
            description="Record rent, utilities, chemicals and salaries to see your cash outflow clearly."
          >
            <Button onClick={openCreate}>
              <Plus /> Record your first expense
            </Button>
          </EmptyState>
        ) : (
          <>
            <ExpenseTable
              expenses={data?.data ?? []}
              loading={loading}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={handleSort}
              onEdit={(e) => {
                setEditing(e);
                setModalOpen(true);
              }}
              onApprove={(e) => void handleApprove(e)}
              onReject={(e) => void handleReject(e)}
              onDelete={setDeleteTarget}
            />
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

      <ExpenseModal open={modalOpen} onOpenChange={setModalOpen} expense={editing} onSaved={handleSaved} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete expense?"
        description={`This ${deleteTarget ? EXPENSE_CATEGORY_LABEL[deleteTarget.category].toLowerCase() : "expense"} record of ${deleteTarget ? formatCurrency(deleteTarget.amount) : ""} will be permanently removed.`}
        loading={busy}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}

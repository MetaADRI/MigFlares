import { useCallback, useEffect, useState } from "react";
import { UserPlus, UserRound } from "lucide-react";
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
import { EmployeeModal } from "@/components/employees/employee-modal";
import { EmployeeProfileDrawer } from "@/components/employees/employee-profile-drawer";
import { EmployeeTable } from "@/components/employees/employee-table";
import { useDebounce } from "@/hooks/use-debounce";
import { employeesService } from "@/services/employees.service";
import { EMPLOYEE_POSITIONS } from "@/constants";
import type { Paginated } from "@/types/api";
import type { Employee } from "@/types";

const PAGE_SIZE = 10;

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [position, setPosition] = useState("all");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Employee> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [drawerEmployee, setDrawerEmployee] = useState<Employee | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    employeesService
      .list({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        position: position === "all" ? undefined : position,
        status: status === "all" ? undefined : status,
        sortBy,
        sortDir,
      })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load employees");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, position, status, sortBy, sortDir, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, position, status, sortBy, sortDir]);

  useEffect(() => {
    return load();
  }, [load]);

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setDrawerEmployee(null);
    setEditing(employee);
    setModalOpen(true);
  };

  const handleSaved = () => setRefreshKey((k) => k + 1);

  const handleSuspend = async () => {
    if (!suspendTarget) return;
    setBusy(true);
    try {
      await employeesService.suspend(suspendTarget.id, !suspendTarget.isActive);
      toast.success(suspendTarget.isActive ? "Employee suspended" : "Employee reactivated");
      setSuspendTarget(null);
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error("Failed to update employee status");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await employeesService.remove(deleteTarget.id);
      toast.success("Employee removed");
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete employee");
    } finally {
      setBusy(false);
    }
  };

  const isEmpty = !loading && data?.total === 0 && !debouncedSearch && position === "all" && status === "all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="Manage your crew — profiles, payroll and performance at a glance."
      >
        <Button onClick={openCreate}>
          <UserPlus /> Add Employee
        </Button>
      </PageHeader>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, phone or NRC…"
          className="w-full sm:max-w-xs"
        />
        <Select value={position} onValueChange={setPosition}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All positions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All positions</SelectItem>
            {EMPLOYEE_POSITIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Active + suspended</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border/70 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
        {isEmpty ? (
          <EmptyState
            icon={UserRound}
            title="No employees yet"
            description="Add your crew — attendants, detailers and cashiers — to start assigning washes."
          >
            <Button onClick={openCreate}>
              <UserPlus /> Add your first employee
            </Button>
          </EmptyState>
        ) : (
          <>
            <EmployeeTable
              employees={data?.data ?? []}
              loading={loading}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={handleSort}
              onView={setDrawerEmployee}
              onEdit={openEdit}
              onSuspend={setSuspendTarget}
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

      <EmployeeModal open={modalOpen} onOpenChange={setModalOpen} employee={editing} onSaved={handleSaved} />
      <EmployeeProfileDrawer
        open={Boolean(drawerEmployee)}
        onOpenChange={(open) => {
          if (!open) setDrawerEmployee(null);
        }}
        employee={drawerEmployee}
        onEdit={openEdit}
      />
      <ConfirmDialog
        open={Boolean(suspendTarget)}
        onOpenChange={(open) => {
          if (!open) setSuspendTarget(null);
        }}
        title={suspendTarget?.isActive ? "Suspend employee?" : "Reactivate employee?"}
        description={
          suspendTarget?.isActive
            ? `${suspendTarget.name} will no longer appear on the wash form or receive new assignments.`
            : `${suspendTarget?.name ?? "This employee"} will be available for wash assignments again.`
        }
        confirmLabel={suspendTarget?.isActive ? "Suspend" : "Reactivate"}
        loading={busy}
        onConfirm={() => void handleSuspend()}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete employee?"
        description={`${deleteTarget?.name ?? "This employee"} will be permanently removed. Employees with wash history can't be deleted — suspend them instead.`}
        loading={busy}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}

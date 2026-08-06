import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Users, UserPlus } from "lucide-react";
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
import { CustomerModal } from "@/components/customers/customer-modal";
import { CustomerProfileDrawer } from "@/components/customers/customer-profile-drawer";
import { CustomerTable } from "@/components/customers/customer-table";
import { useDebounce } from "@/hooks/use-debounce";
import { customersService } from "@/services/customers.service";
import { CUSTOMER_STATUS_META } from "@/constants";
import type { Paginated } from "@/types/api";
import type { Customer } from "@/types";

const PAGE_SIZE = 10;

export default function CustomersPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Customer> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [drawerCustomer, setDrawerCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // URL-driven actions: ?new=1 opens the create modal (dashboard quick action).
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("new") === "1") {
      setEditing(null);
      setModalOpen(true);
      navigate("/customers", { replace: true });
    }
    const id = params.get("id");
    if (id) {
      customersService
        .listAll()
        .then((list) => {
          const c = list.find((x) => x.id === id);
          if (c) setDrawerCustomer(c);
        })
        .catch(() => undefined);
      navigate("/customers", { replace: true });
    }
  }, [location.search, navigate]);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    customersService
      .list({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        status: status === "all" ? undefined : status,
        sortBy,
        sortDir,
      })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load customers");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, status, sortBy, sortDir, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, sortBy, sortDir]);

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

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await customersService.remove(deleteTarget.id);
      toast.success("Customer deleted");
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error("Failed to delete customer");
    } finally {
      setDeleting(false);
    }
  };

  const isEmpty = !loading && data?.total === 0 && !debouncedSearch && status === "all";
  const noResults = !loading && data?.total === 0 && (debouncedSearch || status !== "all");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage profiles, track visits and build loyal relationships."
      >
        <Button onClick={openCreate}>
          <UserPlus /> Add Customer
        </Button>
      </PageHeader>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name or phone…"
          className="w-full sm:max-w-xs"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(CUSTOMER_STATUS_META).map(([key, meta]) => (
              <SelectItem key={key} value={key}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border/70 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
        {isEmpty ? (
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="Start building your customer list — every wash starts with a profile."
          >
            <Button onClick={openCreate}>
              <UserPlus /> Add your first customer
            </Button>
          </EmptyState>
        ) : noResults ? (
          <EmptyState
            icon={Users}
            title="No matching customers"
            description={`Nothing found for "${debouncedSearch}"${
              status !== "all" ? ` with the selected status` : ""
            }. Try a different search.`}
          />
        ) : (
          <>
            <CustomerTable
              customers={data?.data ?? []}
              loading={loading}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={handleSort}
              onView={setDrawerCustomer}
              onEdit={openEdit}
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

      <CustomerModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        customer={editing}
        onSaved={handleSaved}
      />
      <CustomerProfileDrawer
        open={Boolean(drawerCustomer)}
        onOpenChange={(open) => {
          if (!open) setDrawerCustomer(null);
        }}
        customer={drawerCustomer}
        onEdit={(c) => {
          setDrawerCustomer(null);
          openEdit(c);
        }}
        onNewVehicle={(c) => {
          navigate(`/vehicles?new=1&customerId=${c.id}`);
        }}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete customer?"
        description={`This will permanently remove ${deleteTarget?.firstName} ${deleteTarget?.lastName}, their vehicles and wash history. This action cannot be undone.`}
        loading={deleting}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}

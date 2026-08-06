import { useCallback, useEffect, useState } from "react";
import { LayoutGrid, List, Plus, Sparkles } from "lucide-react";
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
import { ServiceCard } from "@/components/services/service-card";
import { ServiceModal } from "@/components/services/service-modal";
import { ServiceTable } from "@/components/services/service-table";
import { useDebounce } from "@/hooks/use-debounce";
import { servicesService } from "@/services/services.service";
import { SERVICE_CATEGORIES } from "@/constants";
import type { Paginated } from "@/types/api";
import type { Service } from "@/types";
import { cn } from "@/utils/cn";

const PAGE_SIZE = 12;

export default function ServicesPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [category, setCategory] = useState("all");
  const [active, setActive] = useState("all");
  const [sortBy, setSortBy] = useState("displayOrder");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"cards" | "table">("cards");
  const [data, setData] = useState<Paginated<Service> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<Service | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    servicesService
      .list({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        category: category === "all" ? undefined : category,
        active: active === "all" ? undefined : active,
        sortBy,
        sortDir,
      })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load services");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, category, active, sortBy, sortDir, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, active, sortBy, sortDir]);

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

  const openEdit = (service: Service) => {
    setEditing(service);
    setModalOpen(true);
  };

  const handleSaved = () => setRefreshKey((k) => k + 1);

  const handleDuplicate = async (service: Service) => {
    try {
      const copy = await servicesService.duplicate(service.id);
      toast.success(`Duplicated as "${copy.name}"`);
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error("Failed to duplicate service");
    }
  };

  const handleToggle = async (target: Service | null) => {
    if (!target) return;
    try {
      await servicesService.toggle(target.id, !target.isActive);
      toast.success(target.isActive ? "Service deactivated" : "Service activated");
      setToggleTarget(null);
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error("Failed to update service");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await servicesService.remove(deleteTarget.id);
      toast.success("Service deleted");
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete service");
    } finally {
      setDeleting(false);
    }
  };

  const isEmpty = !loading && data?.total === 0 && !debouncedSearch && category === "all" && active === "all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Services"
        description="Catalogue the washes you sell — pricing, presentation and stock consumption."
      >
        <Button onClick={openCreate}>
          <Plus /> Add Service
        </Button>
      </PageHeader>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search services…"
            className="w-full sm:max-w-xs"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {SERVICE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={active} onValueChange={setActive}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Active + inactive</SelectItem>
              <SelectItem value="true">Active only</SelectItem>
              <SelectItem value="false">Inactive only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Select value={sortBy} onValueChange={(v) => handleSort(v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="displayOrder">Display order</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="price">Price</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-xl border border-border/70 bg-card p-1">
            {(["cards", "table"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  view === v ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v === "cards" ? <LayoutGrid className="size-4" /> : <List className="size-4" />}
                <span className="hidden sm:inline">{v === "cards" ? "Cards" : "Table"}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {isEmpty ? (
        <div className="rounded-2xl border border-border/70 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
          <EmptyState
            icon={Sparkles}
            title="No services yet"
            description="Create your first service — an Express Rinse or a Full Wash — and it will appear here."
          >
            <Button onClick={openCreate}>
              <Plus /> Add your first service
            </Button>
          </EmptyState>
        </div>
      ) : view === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: loading ? 6 : 0 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
          ))}
          {data?.data.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={openEdit}
              onDuplicate={(s) => void handleDuplicate(s)}
              onToggle={setToggleTarget}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border/70 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
          <ServiceTable
            services={data?.data ?? []}
            loading={loading}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            onEdit={openEdit}
            onDuplicate={(s) => void handleDuplicate(s)}
            onToggle={setToggleTarget}
            onDelete={setDeleteTarget}
          />
        </div>
      )}

      {!isEmpty && data && data.totalPages > 1 ? (
        <PaginationBar
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      ) : null}

      <ServiceModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        service={editing}
        onSaved={handleSaved}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete service?"
        description={`${deleteTarget?.name ?? "This service"} will be permanently removed. Services with wash history can't be deleted — deactivate them instead.`}
        loading={deleting}
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
      />
      <ConfirmDialog
        open={Boolean(toggleTarget)}
        onOpenChange={(open) => {
          if (!open) setToggleTarget(null);
        }}
        title={toggleTarget?.isActive ? "Deactivate service?" : "Activate service?"}
        description={
          toggleTarget?.isActive
            ? `${toggleTarget.name} will be hidden from the wash form and receipts.`
            : `${toggleTarget?.name ?? "This service"} will become available on the wash form again.`
        }
        confirmLabel={toggleTarget?.isActive ? "Deactivate" : "Activate"}
        onConfirm={() => void handleToggle(toggleTarget)}
      />
    </div>
  );
}

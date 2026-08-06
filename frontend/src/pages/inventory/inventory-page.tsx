import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  Package,
  PackagePlus,
  Plus,
  ShoppingCart,
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
import { InventoryItemModal } from "@/components/inventory/inventory-item-modal";
import { InventoryMovementsDrawer } from "@/components/inventory/inventory-movements-drawer";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { StockAdjustModal } from "@/components/inventory/stock-adjust-modal";
import { useDebounce } from "@/hooks/use-debounce";
import { inventoryService } from "@/services/inventory.service";
import { INVENTORY_CATEGORIES } from "@/constants";
import type { Paginated } from "@/types/api";
import type { InventoryItem, InventoryStats } from "@/types";
import { formatCurrency } from "@/utils/format";

const PAGE_SIZE = 10;

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [category, setCategory] = useState("all");
  const [stock, setStock] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<InventoryItem> | null>(null);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<InventoryItem | null>(null);
  const [movementsItem, setMovementsItem] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    inventoryService
      .list({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        category: category === "all" ? undefined : category,
        stock: stock === "all" ? undefined : stock,
        sortBy,
        sortDir,
      })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load inventory");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, category, stock, sortBy, sortDir, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, stock, sortBy, sortDir]);

  useEffect(() => {
    return load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    inventoryService
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
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const handleSaved = () => setRefreshKey((k) => k + 1);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await inventoryService.remove(deleteTarget.id);
      toast.success("Item deleted");
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      setDeleting(false);
    }
  };

  const isEmpty = !loading && data?.total === 0 && !debouncedSearch && category === "all" && stock === "all";
  const lowStockItems = (stats?.lowStockItems ?? []).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Chemicals, equipment and consumables — stock levels and purchasing at a glance."
      >
        <Button onClick={openCreate}>
          <Plus /> Add Item
        </Button>
      </PageHeader>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total inventory value"
          value={formatCurrency(stats?.totalValue ?? 0)}
          icon={Wallet}
          iconClassName="bg-emerald-50 text-emerald-600"
          index={0}
        />
        <StatCard
          label="Low stock items"
          value={String(stats?.lowStockCount ?? 0)}
          icon={AlertTriangle}
          iconClassName="bg-amber-50 text-amber-600"
          index={1}
        />
        <StatCard
          label="Out of stock"
          value={String(stats?.outOfStockCount ?? 0)}
          icon={Package}
          iconClassName="bg-red-50 text-red-600"
          index={2}
        />
        <StatCard
          label="Monthly purchases"
          value={formatCurrency(stats?.monthlyPurchases ?? 0)}
          icon={ShoppingCart}
          iconClassName="bg-sky-50 text-sky-600"
          index={3}
        />
      </div>

      {/* Low stock alert */}
      {lowStockItems > 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {lowStockItems} item{lowStockItems > 1 ? "s" : ""} need restocking
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                Stock has dropped to or below the reorder level. Replenish before it impacts wash operations.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
            onClick={() => setStock("low")}
          >
            <ArrowDownToLine /> View low stock
          </Button>
        </div>
      ) : null}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, SKU or supplier…"
          className="w-full sm:max-w-xs"
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {INVENTORY_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stock} onValueChange={setStock}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All stock" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stock</SelectItem>
            <SelectItem value="low">Low stock</SelectItem>
            <SelectItem value="out">Out of stock</SelectItem>
          </SelectContent>
        </Select>
        <div className="sm:ml-auto">
          <Select value={sortBy} onValueChange={(v) => handleSort(v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="quantityAvailable">Stock level</SelectItem>
              <SelectItem value="costPrice">Cost price</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border/70 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
        {isEmpty ? (
          <EmptyState
            icon={PackagePlus}
            title="No inventory yet"
            description="Add your first product — soap, towels, pressure guns — to start tracking stock."
          >
            <Button onClick={openCreate}>
              <Plus /> Add your first item
            </Button>
          </EmptyState>
        ) : (
          <>
            <InventoryTable
              items={data?.data ?? []}
              loading={loading}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={handleSort}
              onView={setMovementsItem}
              onEdit={(item) => {
                setEditing(item);
                setModalOpen(true);
              }}
              onAdjust={setAdjustTarget}
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

      <InventoryItemModal open={modalOpen} onOpenChange={setModalOpen} item={editing} onSaved={handleSaved} />
      <StockAdjustModal
        open={Boolean(adjustTarget)}
        onOpenChange={(open) => {
          if (!open) setAdjustTarget(null);
        }}
        item={adjustTarget}
        onSaved={handleSaved}
      />
      <InventoryMovementsDrawer
        open={Boolean(movementsItem)}
        onOpenChange={(open) => {
          if (!open) setMovementsItem(null);
        }}
        item={movementsItem}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete inventory item?"
        description={`${deleteTarget?.name ?? "This item"} will be permanently removed along with its movement history.`}
        loading={deleting}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}

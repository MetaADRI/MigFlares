import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Car, Plus } from "lucide-react";
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
import { VehicleDetailsDrawer } from "@/components/vehicles/vehicle-details-drawer";
import { VehicleModal } from "@/components/vehicles/vehicle-modal";
import { VehicleTable } from "@/components/vehicles/vehicle-table";
import { useDebounce } from "@/hooks/use-debounce";
import { vehiclesService } from "@/services/vehicles.service";
import { VEHICLE_STATUS_META, VEHICLE_TYPES } from "@/constants";
import type { Vehicle } from "@/types";
import type { Paginated } from "@/types/api";

const PAGE_SIZE = 10;

export default function VehiclesPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [vehicleType, setVehicleType] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Vehicle> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [initialCustomerId, setInitialCustomerId] = useState<string | undefined>(undefined);
  const [drawerVehicle, setDrawerVehicle] = useState<Vehicle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);

  // URL-driven actions: ?new=1 (+ optional ?customerId=).
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("new") === "1") {
      setEditing(null);
      setInitialCustomerId(params.get("customerId") ?? undefined);
      setModalOpen(true);
      navigate("/vehicles", { replace: true });
    }
  }, [location.search, navigate]);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    vehiclesService
      .list({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        vehicleType: vehicleType === "all" ? undefined : vehicleType,
        status: status === "all" ? undefined : status,
      })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load vehicles");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, vehicleType, status, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, vehicleType, status]);

  useEffect(() => {
    return load();
  }, [load]);

  const handleSaved = () => setRefreshKey((k) => k + 1);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await vehiclesService.remove(deleteTarget.id);
      toast.success("Vehicle deleted");
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error("Failed to delete vehicle");
    } finally {
      setDeleting(false);
    }
  };

  const isEmpty = !loading && data?.total === 0 && !debouncedSearch && vehicleType === "all" && status === "all";
  const noResults = !loading && data?.total === 0 && (debouncedSearch || vehicleType !== "all" || status !== "all");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicles"
        description="Manage the fleet — every plate, owner and wash history in one place."
      >          <Button onClick={() => setModalOpen(true)}>
          <Plus /> Add Vehicle
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search plate, owner or model…"
          className="w-full sm:max-w-xs"
        />
        <Select value={vehicleType} onValueChange={setVehicleType}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Vehicle type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {VEHICLE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(VEHICLE_STATUS_META).map(([key, meta]) => (
              <SelectItem key={key} value={key}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
        {isEmpty ? (
          <EmptyState
            icon={Car}
            title="No vehicles registered"
            description="Add your first vehicle to start tracking washes per plate."
          >
            <Button onClick={() => setModalOpen(true)}>
              <Plus /> Register a vehicle
            </Button>
          </EmptyState>
        ) : noResults ? (
          <EmptyState
            icon={Car}
            title="No matching vehicles"
            description="Try adjusting your search or filters."
          />
        ) : (
          <>
            <VehicleTable
              vehicles={data?.data ?? []}
              loading={loading}
              onView={setDrawerVehicle}
              onEdit={(v) => {
                setEditing(v);
                setModalOpen(true);
              }}
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

      <VehicleModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        vehicle={editing}
        initialCustomerId={initialCustomerId}
        onSaved={handleSaved}
      />
      <VehicleDetailsDrawer
        open={Boolean(drawerVehicle)}
        onOpenChange={(open) => {
          if (!open) setDrawerVehicle(null);
        }}
        vehicle={drawerVehicle}
        onEdit={(v) => {
          setDrawerVehicle(null);
          setEditing(v);
          setModalOpen(true);
        }}
        onViewCustomer={(c) => navigate(`/customers?id=${c.id}`)}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete vehicle?"
        description={`This will permanently remove ${deleteTarget?.plateNumber ?? "this vehicle"} and its wash history. This action cannot be undone.`}
        loading={deleting}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}

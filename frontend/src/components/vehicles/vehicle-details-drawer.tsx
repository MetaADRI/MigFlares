import { useEffect, useState } from "react";
import { Car, Gauge, Pencil, Phone, UserRound, Wallet } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, type StatusMeta } from "@/components/common/status-badge";
import { VEHICLE_STATUS_META, VEHICLE_TYPE_LABEL, WASH_STATUS_META } from "@/constants";
import { customersService } from "@/services/customers.service";
import { washJobsService } from "@/services/wash-jobs.service";
import type { Customer, Vehicle, WashJob } from "@/types";
import { formatCurrency, formatDate } from "@/utils/format";

interface VehicleDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  onEdit: (vehicle: Vehicle) => void;
  onViewCustomer: (customer: Customer) => void;
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 px-3.5 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function VehicleDetailsDrawer({
  open,
  onOpenChange,
  vehicle,
  onEdit,
  onViewCustomer,
}: VehicleDetailsDrawerProps) {
  const [owner, setOwner] = useState<Customer | null>(null);
  const [washes, setWashes] = useState<WashJob[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !vehicle) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      customersService.listAll(),
      washJobsService.listByCustomer(vehicle.customerId),
    ])
      .then(([customers, history]) => {
        if (cancelled) return;
        setOwner(customers.find((c) => c.id === vehicle.customerId) ?? null);
        setWashes(history.filter((w) => w.vehicleId === vehicle.id));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, vehicle]);

  const statusMeta: StatusMeta = vehicle ? VEHICLE_STATUS_META[vehicle.status] : VEHICLE_STATUS_META.ACTIVE;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-md">
        <ScrollArea className="h-full pr-3">
          <SheetHeader className="border-b border-border/60 pb-5 pr-8">
            {vehicle ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border/60 bg-muted/50 text-muted-foreground">
                    {vehicle.imageUrl ? (
                      <img src={vehicle.imageUrl} alt={vehicle.plateNumber} className="size-full object-cover" />
                    ) : (
                      <Car className="size-7" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <SheetTitle className="truncate font-mono text-xl font-bold tracking-wide">
                      {vehicle.plateNumber}
                    </SheetTitle>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {vehicle.make} {vehicle.model}
                    </p>
                    <div className="mt-2">
                      <StatusBadge meta={statusMeta} />
                    </div>
                  </div>
                </div>
                <SheetDescription className="pt-3 text-xs text-muted-foreground">
                  Registered {formatDate(vehicle.createdAt)} · {vehicle.washCount} washes completed
                </SheetDescription>
              </>
            ) : null}
          </SheetHeader>

          <div className="p-5">
            {/* Owner */}
            {loading ? (
              <Skeleton className="h-16 w-full" />
            ) : owner ? (
              <button
                type="button"
                onClick={() => onViewCustomer(owner)}
                className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-orange-50/40"
              >
                <Avatar name={`${owner.firstName} ${owner.lastName}`} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <UserRound className="size-3.5 text-muted-foreground" /> {owner.firstName} {owner.lastName}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="size-3" /> {owner.phone}
                  </p>
                </div>
                <span className="text-xs font-medium text-primary">View →</span>
              </button>
            ) : null}

            {/* Specs */}
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <Spec label="Make" value={vehicle?.make ?? "—"} />
              <Spec label="Model" value={vehicle?.model ?? "—"} />
              <Spec label="Type" value={vehicle ? VEHICLE_TYPE_LABEL[vehicle.vehicleType] : "—"} />
              <Spec label="Year" value={vehicle?.year ? String(vehicle.year) : "—"} />
              <div className="col-span-2">
                <Spec label="Colour" value={vehicle?.color ?? "—"} />
              </div>
            </div>

            {/* Wash history */}
            <div className="mt-6">
              <div className="mb-2.5 flex items-center gap-1.5">
                <Wallet className="size-3.5 text-muted-foreground" />
                <h4 className="text-sm font-semibold text-foreground">Wash History</h4>
                <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Gauge className="size-3" /> {vehicle?.washCount ?? 0} total
                </span>
              </div>
              <div className="space-y-2">
                {loading ? (
                  <Skeleton className="h-14 w-full" />
                ) : washes.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                    No washes recorded for this vehicle.
                  </p>
                ) : (
                  washes.map((w) => (
                    <div key={w.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/60 px-3.5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{w.serviceName}</p>
                        <p className="text-xs text-muted-foreground">
                          {w.reference} · {formatDate(w.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(w.total)}</p>
                        <StatusBadge meta={WASH_STATUS_META[w.status]} className="mt-1" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="border-t border-border/60 bg-card px-5 py-4">
          {vehicle ? (
            <Button className="w-full" variant="outline" onClick={() => onEdit(vehicle)}>
              <Pencil /> Edit vehicle
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

import { useEffect, useState } from "react";
import { Car, Mail, MapPin, Pencil, Phone, Plus, Wallet } from "lucide-react";
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
import { CUSTOMER_STATUS_META, VEHICLE_STATUS_META, WASH_STATUS_META } from "@/constants";
import { vehiclesService } from "@/services/vehicles.service";
import { washJobsService } from "@/services/wash-jobs.service";
import type { Customer, Vehicle, WashJob } from "@/types";
import { formatCurrency, formatDate } from "@/utils/format";

interface CustomerProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onEdit: (customer: Customer) => void;
  onNewVehicle: (customer: Customer) => void;
}

export function CustomerProfileDrawer({
  open,
  onOpenChange,
  customer,
  onEdit,
  onNewVehicle,
}: CustomerProfileDrawerProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [washes, setWashes] = useState<WashJob[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !customer) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      vehiclesService.listByCustomer(customer.id),
      washJobsService.listByCustomer(customer.id),
    ])
      .then(([v, w]) => {
        if (!cancelled) {
          setVehicles(v);
          setWashes(w);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, customer]);

  const statusMeta: StatusMeta = customer ? CUSTOMER_STATUS_META[customer.status] : CUSTOMER_STATUS_META.ACTIVE;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-md">
        <ScrollArea className="h-full pr-3">
          <SheetHeader className="border-b border-border/60 pb-5 pr-8">
            {customer ? (
              <>
                <div className="flex items-center gap-4">
                  <Avatar name={`${customer.firstName} ${customer.lastName}`} size="lg" />
                  <div className="min-w-0">
                    <SheetTitle className="truncate text-xl">
                      {customer.firstName} {customer.lastName}
                    </SheetTitle>
                    <div className="mt-1.5">
                      <StatusBadge meta={statusMeta} />
                    </div>
                  </div>
                </div>
                <SheetDescription className="space-y-1.5 pt-3">
                  <p className="flex items-center gap-2">
                    <Phone className="size-3.5 shrink-0" /> {customer.phone}
                  </p>
                  {customer.email ? (
                    <p className="flex items-center gap-2">
                      <Mail className="size-3.5 shrink-0" /> {customer.email}
                    </p>
                  ) : null}
                  {customer.address ? (
                    <p className="flex items-center gap-2">
                      <MapPin className="size-3.5 shrink-0" /> {customer.address}
                    </p>
                  ) : null}
                </SheetDescription>
              </>
            ) : null}
          </SheetHeader>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 p-5">
            <div className="rounded-xl border border-border/60 bg-background/60 p-3 text-center">
              <p className="font-display text-xl font-bold text-foreground">{customer?.visits ?? 0}</p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Visits
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 p-3 text-center">
              <p className="font-display text-xl font-bold text-foreground">
                {customer ? formatCurrency(customer.totalSpent) : "K0"}
              </p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Total spent
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 p-3 text-center">
              <p className="font-display text-xl font-bold text-foreground">{vehicles.length}</p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Vehicles
              </p>
            </div>
          </div>

          {/* Vehicles */}
          <div className="px-5 pb-5">
            <div className="mb-2.5 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Vehicles</h4>
              {customer ? (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onNewVehicle(customer)}>
                  <Plus /> Add
                </Button>
              ) : null}
            </div>
            <div className="space-y-2">
              {loading ? (
                <Skeleton className="h-14 w-full" />
              ) : vehicles.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                  No vehicles registered yet.
                </p>
              ) : (
                vehicles.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 px-3.5 py-3"
                  >
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-600">
                      <Car className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{v.plateNumber}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {v.make} {v.model} · {v.color} · {v.year ?? "—"}
                      </p>
                    </div>
                    <StatusBadge meta={VEHICLE_STATUS_META[v.status]} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Wash history */}
          <div className="px-5 pb-6">
            <div className="mb-2.5 flex items-center gap-1.5">
              <Wallet className="size-3.5 text-muted-foreground" />
              <h4 className="text-sm font-semibold text-foreground">Wash History</h4>
            </div>
            <div className="space-y-2">
              {loading ? (
                <Skeleton className="h-14 w-full" />
              ) : washes.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                  No washes recorded yet.
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
        </ScrollArea>

        <SheetFooter className="border-t border-border/60 bg-card px-5 py-4">
          {customer ? (
            <Button className="w-full" variant="outline" onClick={() => onEdit(customer)}>
              <Pencil /> Edit profile
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

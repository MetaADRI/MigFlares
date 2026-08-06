import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PhotoUpload } from "@/components/common/photo-upload";
import { PAYMENT_METHODS, WASH_EXTRAS, WASH_STATUS_META } from "@/constants";
import { washJobsService } from "@/services/wash-jobs.service";
import type { Customer, Employee, Service, Vehicle, WashExtra, WashJob } from "@/types";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/format";
import { washJobSchema, type WashJobInput } from "@/utils/validation";

interface WashJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (job: WashJob) => void;
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label} {required ? <span className="text-red-500">*</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

export function WashJobModal({ open, onOpenChange, onCreated }: WashJobModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    reset,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<WashJobInput>({
    resolver: zodResolver(washJobSchema) as Resolver<WashJobInput>,
    defaultValues: {
      customerId: "",
      vehicleId: "",
      serviceId: "",
      extras: [],
      discount: 0,
      paymentMethod: "CASH",
      employeeId: "",
      notes: "",
      status: "PENDING",
      beforePhotos: [],
      afterPhotos: [],
    },
  });

  const customerId = watch("customerId");
  const serviceId = watch("serviceId");
  const extras = watch("extras");
  const discount = Number(watch("discount")) || 0;

  // Load form options on open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([
      washJobsService.getCustomers(),
      washJobsService.getServices(),
      washJobsService.getEmployees(),
    ])
      .then(([c, s, e]) => {
        if (!cancelled) {
          setCustomers(c);
          setServices(s);
          setEmployees(e);
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load form options");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Reset form each time it opens.
  useEffect(() => {
    if (open) {
      reset({
        customerId: "",
        vehicleId: "",
        serviceId: "",
        extras: [],
        discount: 0,
        paymentMethod: "CASH",
        employeeId: "",
        notes: "",
        status: "PENDING",
        beforePhotos: [],
        afterPhotos: [],
      });
    }
  }, [open, reset]);

  // Load vehicles for the selected customer.
  useEffect(() => {
    if (!customerId) {
      setVehicles([]);
      setValue("vehicleId", "");
      return;
    }
    let cancelled = false;
    setVehiclesLoading(true);
    washJobsService
      .getVehiclesByCustomer(customerId)
      .then((v) => {
        if (!cancelled) setVehicles(v);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setVehiclesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId, setValue]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId),
    [services, serviceId],
  );

  const subtotal = (selectedService?.price ?? 0) + extras.reduce((sum, e) => sum + e.price, 0);
  const total = Math.max(0, subtotal - discount);

  const toggleExtra = (extra: WashExtra) => {
    const active = extras.some((e) => e.id === extra.id);
    setValue(
      "extras",
      active ? extras.filter((e) => e.id !== extra.id) : [...extras, { ...extra }],
      { shouldValidate: true },
    );
  };

  const onSubmit = async (values: WashJobInput) => {
    setSubmitting(true);
    try {
      const job = await washJobsService.create(values);
      toast.success(
        job.status === "COMPLETED"
          ? `Wash completed — receipt ${job.receiptNo ?? "generated"}`
          : `Wash job ${job.reference} created`,
      );
      onCreated(job);
      onOpenChange(false);
    } catch {
      toast.error("Failed to save wash job. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Wash Job</DialogTitle>
          <DialogDescription>
            Record a wash from customer to payment — receipt is generated on completion.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* Customer & vehicle */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer" required error={errors.customerId?.message}>
              <Select
                value={customerId}
                onValueChange={(v) => {
                  setValue("customerId", v);
                  setValue("vehicleId", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} · {c.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Vehicle" required error={errors.vehicleId?.message}>
              <Select
                value={watch("vehicleId")}
                onValueChange={(v) => setValue("vehicleId", v)}
                disabled={!customerId || vehiclesLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !customerId
                        ? "Select a customer first"
                        : vehiclesLoading
                          ? "Loading vehicles…"
                          : "Select vehicle"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plateNumber} · {v.make} {v.model}
                    </SelectItem>
                  ))}
                  {vehicles.length === 0 && customerId ? (
                    <p className="px-2.5 py-2 text-xs text-muted-foreground">
                      No vehicles registered for this customer.
                    </p>
                  ) : null}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Service & payment */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Service" required error={errors.serviceId?.message}>
              <Select value={serviceId} onValueChange={(v) => setValue("serviceId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · {formatCurrency(s.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Payment method" required error={errors.paymentMethod?.message}>
              <Select
                value={watch("paymentMethod")}
                onValueChange={(v) => setValue("paymentMethod", v as WashJobInput["paymentMethod"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Extras */}
          <div className="space-y-2">
            <Label>Extras</Label>
            <div className="flex flex-wrap gap-2">
              {WASH_EXTRAS.map((extra) => {
                const active = extras.some((e) => e.id === extra.id);
                return (
                  <button
                    key={extra.id}
                    type="button"
                    onClick={() => toggleExtra(extra)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 active:scale-95",
                      active
                        ? "border-primary bg-orange-50 text-orange-700 shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-3.5 place-items-center rounded-full border text-[9px] leading-none",
                        active ? "border-primary bg-primary text-white" : "border-muted-foreground/50",
                      )}
                    >
                      {active ? "✓" : "+"}
                    </span>
                    {extra.name}
                    <span className={cn(active ? "text-orange-600" : "text-muted-foreground")}>
                      +{formatCurrency(extra.price)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Discount, employee, status */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Discount (K)" error={errors.discount?.message}>
              <Input type="number" min={0} placeholder="0" {...register("discount")} />
            </Field>
            <Field label="Assigned employee">
              <Select
                value={watch("employeeId")}
                onValueChange={(v) => setValue("employeeId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} · {e.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status" required error={errors.status?.message}>
              <Select
                value={watch("status")}
                onValueChange={(v) => setValue("status", v as WashJobInput["status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(WASH_STATUS_META).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Notes" error={errors.notes?.message}>
            <Textarea placeholder="Special instructions, damage notes, customer requests…" rows={2} {...register("notes")} />
          </Field>

          {/* Photos */}
          <div className="grid gap-4 sm:grid-cols-2">
            <PhotoUpload
              value={watch("beforePhotos")}
              onChange={(photos) => setValue("beforePhotos", photos)}
              label="Before photos"
            />
            <PhotoUpload
              value={watch("afterPhotos")}
              onChange={(photos) => setValue("afterPhotos", photos)}
              label="After photos"
            />
          </div>

          {/* Totals */}
          <div className="rounded-xl border border-border/70 bg-muted/40 p-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>
                  Service{subtotal > (selectedService?.price ?? 0) ? " + extras" : ""}
                </span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 ? (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span className="text-red-500">−{formatCurrency(discount)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between border-t border-border/70 pt-2">
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <ReceiptText className="size-4 text-primary" /> Total due
                </span>
                <span className="font-display text-xl font-bold text-foreground">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save wash job
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

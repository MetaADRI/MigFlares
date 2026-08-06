import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
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
import { customersService } from "@/services/customers.service";
import { employeesService } from "@/services/employees.service";
import { servicesService } from "@/services/services.service";
import { vehiclesService } from "@/services/vehicles.service";
import { bookingsService } from "@/services/bookings.service";
import type { Booking, Customer, Employee, Service, Vehicle } from "@/types";
import { formatCurrency } from "@/utils/format";
import { bookingSchema, type BookingInput } from "@/utils/validation";

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (booking: Booking) => void;
  editing?: Booking | null;
  defaultDate?: string;
}

function toDateTimeInput(value: string | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

export function BookingModal({ open, onOpenChange, onSaved, editing, defaultDate }: BookingModalProps) {
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
  } = useForm<BookingInput>({
    resolver: zodResolver(bookingSchema) as Resolver<BookingInput>,
    defaultValues: {
      customerId: "",
      vehicleId: "",
      serviceId: "",
      employeeId: "",
      scheduledAt: "",
      durationMin: 30,
      notes: "",
      status: "PENDING",
    },
  });

  const customerId = watch("customerId");
  const serviceId = watch("serviceId");

  // Load form options on open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([
      customersService.listAll(),
      servicesService.list({ pageSize: 1000, active: "true" }).then((r) => r.data),
      employeesService.list({ pageSize: 1000 }).then((r) => r.data),
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
        customerId: editing?.customerId ?? "",
        vehicleId: editing?.vehicleId ?? "",
        serviceId: editing?.serviceId ?? "",
        employeeId: editing?.employeeId ?? "",
        scheduledAt: toDateTimeInput(editing?.scheduledAt) || defaultDate || "",
        durationMin: editing?.durationMin ?? 30,
        notes: editing?.notes ?? "",
        status: editing?.status ?? "PENDING",
      });
    }
  }, [open, editing, defaultDate, reset]);

  // Load vehicles for the selected customer.
  useEffect(() => {
    if (!customerId) {
      setVehicles([]);
      setValue("vehicleId", "");
      return;
    }
    let cancelled = false;
    setVehiclesLoading(true);
    vehiclesService
      .listByCustomer(customerId)
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

  // Auto-fill duration from the chosen service (only when the user hasn't customised it).
  useEffect(() => {
    if (selectedService?.durationMin && !editing) {
      setValue("durationMin", selectedService.durationMin);
    }
  }, [selectedService, editing, setValue]);

  const onSubmit = async (values: BookingInput) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        employeeId: values.employeeId || null,
        notes: values.notes || null,
      };
      const booking = editing
        ? await bookingsService.update(editing.id, { ...payload, status: undefined })
        : await bookingsService.create({ ...payload, status: "PENDING" });
      toast.success(
        editing
          ? `Booking ${booking.reference} updated`
          : `Booking ${booking.reference} created`,
      );
      onSaved(booking);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit Booking ${editing.reference}` : "New Booking"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Reschedule or change the customer, vehicle, service or attendant."
              : "Reserve a slot — the system checks for vehicle and attendant conflicts."}
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

          {/* Service & attendant */}
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
                      {s.durationMin ? ` · ~${s.durationMin} min` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Assigned attendant">
              <Select value={watch("employeeId")} onValueChange={(v) => setValue("employeeId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {employees
                    .filter((e) => e.isActive)
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} · {e.position}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Date & duration */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date & time" required error={errors.scheduledAt?.message}>
              <Input type="datetime-local" {...register("scheduledAt")} />
            </Field>
            <Field label="Duration (minutes)" required error={errors.durationMin?.message}>
              <Input type="number" min={10} max={480} step={5} {...register("durationMin")} />
            </Field>
          </div>

          <Field label="Notes" error={errors.notes?.message}>
            <Textarea
              placeholder="Special instructions, vehicle condition, customer requests…"
              rows={2}
              {...register("notes")}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              <CalendarClock /> {editing ? "Save changes" : "Create booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

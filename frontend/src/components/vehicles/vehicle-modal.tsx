import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import { customersService } from "@/services/customers.service";
import { vehiclesService } from "@/services/vehicles.service";
import { VEHICLE_TYPES } from "@/constants";
import type { Customer, Vehicle } from "@/types";
import { vehicleSchema, type VehicleInput } from "@/utils/validation";

interface VehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: Vehicle | null;
  initialCustomerId?: string;
  onSaved: (vehicle: Vehicle) => void;
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

export function VehicleModal({
  open,
  onOpenChange,
  vehicle,
  initialCustomerId,
  onSaved,
}: VehicleModalProps) {
  const isEdit = Boolean(vehicle);
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const {
    register,
    reset,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<VehicleInput>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plateNumber: "",
      make: "",
      model: "",
      year: new Date().getFullYear(),
      color: "",
      vehicleType: "SEDAN",
      customerId: "",
    },
  });

  useEffect(() => {
    if (open) {
      customersService
        .listAll()
        .then(setCustomers)
        .catch(() => undefined);
      reset({
        plateNumber: vehicle?.plateNumber ?? "",
        make: vehicle?.make ?? "",
        model: vehicle?.model ?? "",
        year: vehicle?.year ?? new Date().getFullYear(),
        color: vehicle?.color ?? "",
        vehicleType: vehicle?.vehicleType ?? "SEDAN",
        customerId: vehicle?.customerId ?? initialCustomerId ?? "",
      });
    }
  }, [open, vehicle, initialCustomerId, reset]);

  const onSubmit = async (values: VehicleInput) => {
    setSubmitting(true);
    try {
      const saved = isEdit
        ? await vehiclesService.update(vehicle!.id, values)
        : await vehiclesService.create(values);
      toast.success(isEdit ? "Vehicle updated" : "Vehicle registered");
      onSaved(saved);
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedColor = watch("color");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Vehicle" : "Register Vehicle"}</DialogTitle>
          <DialogDescription>
            Add a vehicle to the fleet so washes can be tracked against it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Plate number" error={errors.plateNumber?.message}>
              <Input placeholder="e.g. BAE 4521" {...register("plateNumber")} />
            </Field>
            <Field label="Owner" error={errors.customerId?.message}>
              <Select value={watch("customerId")} onValueChange={(v) => setValue("customerId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select owner" />
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
            <Field label="Make" error={errors.make?.message}>
              <Input placeholder="e.g. Toyota" {...register("make")} />
            </Field>
            <Field label="Model" error={errors.model?.message}>
              <Input placeholder="e.g. Hilux" {...register("model")} />
            </Field>
            <Field label="Year" error={errors.year?.message}>
              <Input type="number" placeholder="2020" {...register("year")} />
            </Field>
            <Field label="Vehicle type" error={errors.vehicleType?.message}>
              <Select value={watch("vehicleType")} onValueChange={(v) => setValue("vehicleType", v as VehicleInput["vehicleType"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Colour" error={errors.color?.message}>
                <div className="relative">
                  <Input placeholder="e.g. White" className="pl-10" {...register("color")} />
                  <span
                    className="absolute left-3 top-1/2 size-4 -translate-y-1/2 rounded-full border border-border/70"
                    style={{ backgroundColor: selectedColor || "transparent" }}
                    aria-hidden
                  />
                </div>
              </Field>
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
            Vehicle photos will be supported once Cloudinary uploads are enabled in Phase 2.
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save changes" : "Register vehicle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

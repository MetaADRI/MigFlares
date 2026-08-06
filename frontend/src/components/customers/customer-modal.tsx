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
import { Textarea } from "@/components/ui/textarea";
import { customersService } from "@/services/customers.service";
import type { Customer } from "@/types";
import { customerSchema, type CustomerInput } from "@/utils/validation";

interface CustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSaved: (customer: Customer) => void;
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

/** Create & edit customer dialog. */
export function CustomerModal({ open, onOpenChange, customer, onSaved }: CustomerModalProps) {
  const isEdit = Boolean(customer);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        firstName: customer?.firstName ?? "",
        lastName: customer?.lastName ?? "",
        phone: customer?.phone ?? "",
        email: customer?.email ?? "",
        address: customer?.address ?? "",
        notes: customer?.notes ?? "",
      });
    }
  }, [open, customer, reset]);

  const onSubmit = async (values: CustomerInput) => {
    setSubmitting(true);
    try {
      const saved = isEdit
        ? await customersService.update(customer!.id, values)
        : await customersService.create(values);
      toast.success(isEdit ? "Customer updated" : "Customer added");
      onSaved(saved);
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Customer" : "Add New Customer"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the customer's profile details."
              : "Create a profile to track visits, spending and vehicles."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" error={errors.firstName?.message}>
              <Input placeholder="e.g. Chanda" {...register("firstName")} />
            </Field>
            <Field label="Last name" error={errors.lastName?.message}>
              <Input placeholder="e.g. Banda" {...register("lastName")} />
            </Field>
            <Field label="Phone number" error={errors.phone?.message}>
              <Input placeholder="+260 977 000 000" {...register("phone")} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" placeholder="name@example.com" {...register("email")} />
            </Field>
          </div>

          <Field label="Address" error={errors.address?.message}>
            <Input placeholder="Area, City" {...register("address")} />
          </Field>

          <Field label="Notes" error={errors.notes?.message}>
            <Textarea
              placeholder="Preferences, fleet details, anything worth remembering…"
              rows={3}
              {...register("notes")}
            />
          </Field>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save changes" : "Add customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

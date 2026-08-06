import { useEffect, useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Loader2, X } from "lucide-react";
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
import { employeesService } from "@/services/employees.service";
import { uploadImage } from "@/services/upload.service";
import { EMPLOYEE_POSITIONS } from "@/constants";
import type { Employee } from "@/types";
import { cn } from "@/utils/cn";
import { initials } from "@/utils/format";
import { employeeSchema, type EmployeeInput } from "@/utils/validation";

interface EmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
  onSaved: (employee: Employee) => void;
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

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Create & edit employee dialog. */
export function EmployeeModal({ open, onOpenChange, employee, onSaved }: EmployeeModalProps) {
  const isEdit = Boolean(employee);
  const [submitting, setSubmitting] = useState(false);
  const [photo, setPhoto] = useState<string | null>(employee?.avatarUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployeeInput>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      nrcNumber: "",
      position: "Attendant",
      salary: 0,
      hireDate: "",
      emergencyName: "",
      emergencyPhone: "",
      emergencyRelation: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      setPhoto(employee?.avatarUrl ?? null);
      reset({
        firstName: employee?.firstName ?? "",
        lastName: employee?.lastName ?? "",
        phone: employee?.phone ?? "",
        email: employee?.email ?? "",
        nrcNumber: employee?.nrcNumber ?? "",
        position: employee?.position ?? "Attendant",
        salary: employee?.salary ?? 0,
        hireDate: toDateInput(employee?.hireDate),
        emergencyName: employee?.emergencyContact?.name ?? "",
        emergencyPhone: employee?.emergencyContact?.phone ?? "",
        emergencyRelation: employee?.emergencyContact?.relation ?? "",
        notes: employee?.notes ?? "",
      });
    }
  }, [open, employee, reset]);

  const onSubmit = async (values: EmployeeInput) => {
    setSubmitting(true);
    try {
      const payload = {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        email: values.email || null,
        avatarUrl: photo,
        nrcNumber: values.nrcNumber || null,
        position: values.position,
        salary: values.salary,
        hireDate: new Date(values.hireDate).toISOString(),
        emergencyContact:
          values.emergencyName || values.emergencyPhone
            ? {
                name: values.emergencyName,
                phone: values.emergencyPhone,
                relation: values.emergencyRelation,
              }
            : null,
        notes: values.notes || null,
      };
      const saved = isEdit
        ? await employeesService.update(employee!.id, payload)
        : await employeesService.create(payload);
      toast.success(isEdit ? "Employee updated" : "Employee added");
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      if (photo) URL.revokeObjectURL(photo);
      setPhoto(url);
      toast.success("Photo uploaded");
    } catch {
      toast.error("Couldn't upload photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Employee" : "Add New Employee"}</DialogTitle>
          <DialogDescription>
            Staff profiles power performance tracking and wash-job assignment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {photo ? (
                <img
                  src={photo}
                  alt="Employee"
                  className="size-20 rounded-2xl border border-border/70 object-cover shadow-sm"
                />
              ) : (
                <div className="grid size-20 place-items-center rounded-2xl border border-dashed border-border bg-muted/40 text-lg font-semibold text-muted-foreground">
                  {employee ? initials(employee.name) : "?"}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1.5 -right-1.5 grid size-7 place-items-center rounded-full bg-primary text-white shadow-md transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Upload photo"
              >
                {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
              </button>
              {photo ? (
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(photo);
                    setPhoto(null);
                  }}
                  className="absolute -top-1.5 -left-1.5 grid size-6 place-items-center rounded-full bg-foreground/80 text-white shadow-md transition-transform hover:scale-110"
                  aria-label="Remove photo"
                >
                  <X className="size-3" />
                </button>
              ) : null}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  void handlePhoto(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Profile photo</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Uploads to Cloudinary in production. Ideal ratio 1:1.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" error={errors.firstName?.message}>
              <Input placeholder="e.g. Tapiwa" {...register("firstName")} />
            </Field>
            <Field label="Last name" error={errors.lastName?.message}>
              <Input placeholder="e.g. Mbewe" {...register("lastName")} />
            </Field>
            <Field label="Phone number" error={errors.phone?.message}>
              <Input placeholder="+260 977 000 000" {...register("phone")} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" placeholder="name@migflares.co.zm" {...register("email")} />
            </Field>
            <Field label="NRC number" error={errors.nrcNumber?.message}>
              <Input placeholder="e.g. 246810/55/1" {...register("nrcNumber")} />
            </Field>
            <Field label="Position" error={errors.position?.message}>
              <select
                {...register("position")}
                className={cn(
                  "flex h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm shadow-sm outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20",
                )}
              >
                {EMPLOYEE_POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Salary (ZMW / month)" error={errors.salary?.message}>
              <Input type="number" min={0} step="0.5" placeholder="0.00" {...register("salary")} />
            </Field>
            <Field label="Date hired" error={errors.hireDate?.message}>
              <Input type="date" {...register("hireDate")} />
            </Field>
          </div>

          <div className="space-y-3 rounded-xl border border-border/70 bg-muted/30 p-4">
            <div>
              <Label>Emergency contact</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">Optional — someone to call in case of emergency.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Name" error={errors.emergencyName?.message}>
                <Input placeholder="Full name" {...register("emergencyName")} />
              </Field>
              <Field label="Phone" error={errors.emergencyPhone?.message}>
                <Input placeholder="+260 977 000 000" {...register("emergencyPhone")} />
              </Field>
              <Field label="Relation" error={errors.emergencyRelation?.message}>
                <Input placeholder="e.g. Wife" {...register("emergencyRelation")} />
              </Field>
            </div>
          </div>

          <Field label="Notes" error={errors.notes?.message}>
            <Textarea placeholder="Skills, certifications, shift preferences…" rows={2} {...register("notes")} />
          </Field>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save changes" : "Add employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

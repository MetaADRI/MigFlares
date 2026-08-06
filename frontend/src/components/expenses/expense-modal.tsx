import { useEffect, useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, UploadCloud, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { expensesService } from "@/services/expenses.service";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/constants";
import type { Expense, PaymentMethod } from "@/types";
import { cn } from "@/utils/cn";
import { expenseSchema, type ExpenseInput } from "@/utils/validation";

interface ExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
  onSaved: (expense: Expense) => void;
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
  if (!iso) return new Date().toISOString().slice(0, 10);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Create & edit expense dialog with receipt upload placeholder. */
export function ExpenseModal({ open, onOpenChange, expense, onSaved }: ExpenseModalProps) {
  const isEdit = Boolean(expense);
  const [submitting, setSubmitting] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    reset,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: 0,
      category: "MISC",
      vendor: "",
      description: "",
      paymentMethod: "CASH",
      expenseDate: "",
      employeeId: "",
    },
  });

  useEffect(() => {
    if (open) {
      setReceiptUrl(expense?.receiptUrl ?? null);
      reset({
        amount: expense?.amount ?? 0,
        category: expense?.category ?? "MISC",
        vendor: expense?.vendor ?? "",
        description: expense?.description ?? "",
        paymentMethod: expense?.paymentMethod ?? "CASH",
        expenseDate: toDateInput(expense?.expenseDate),
        employeeId: "",
      });
    }
  }, [open, expense, reset]);

  const onSubmit = async (values: ExpenseInput) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        expenseDate: new Date(values.expenseDate).toISOString(),
        receiptUrl,
      };
      const saved = isEdit
        ? await expensesService.update(expense!.id, payload)
        : await expensesService.create(payload);
      toast.success(isEdit ? "Expense updated" : "Expense recorded");
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
      <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Expense" : "Record Expense"}</DialogTitle>
          <DialogDescription>
            Log every outflow — new expenses start as pending until approved.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount (ZMW)" error={errors.amount?.message}>
              <Input type="number" min={0} step="0.01" placeholder="0.00" {...register("amount")} />
            </Field>
            <Field label="Category" error={errors.category?.message}>
              <Select value={watch("category")} onValueChange={(v) => setValue("category", v as ExpenseInput["category"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Vendor" error={errors.vendor?.message}>
              <Input placeholder="e.g. ZESCO, Lusaka Chem Supplies" {...register("vendor")} />
            </Field>
            <Field label="Payment method" error={errors.paymentMethod?.message}>
              <Select
                value={watch("paymentMethod")}
                onValueChange={(v) => setValue("paymentMethod", v as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
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
            <Field label="Expense date" error={errors.expenseDate?.message}>
              <Input type="date" {...register("expenseDate")} />
            </Field>
          </div>

          <Field label="Description" error={errors.description?.message}>
            <Textarea
              placeholder="What was this for?"
              rows={2}
              {...register("description")}
            />
          </Field>

          {/* Receipt upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Receipt</p>
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <UploadCloud className="size-3" /> Uploads to Cloudinary
              </span>
            </div>
            {receiptUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-border/70">
                <img src={receiptUrl} alt="Receipt" className="h-32 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(receiptUrl);
                    setReceiptUrl(null);
                  }}
                  className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-foreground/70 text-white backdrop-blur transition-colors hover:bg-foreground"
                  aria-label="Remove receipt"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 py-8 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-orange-50/50 hover:text-primary",
                )}
              >
                <FileText className="size-6" />
                <span className="text-sm font-medium">Upload receipt image</span>
                <span className="text-xs">PNG or JPG — stored via Cloudinary</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (receiptUrl) URL.revokeObjectURL(receiptUrl);
                  setReceiptUrl(URL.createObjectURL(file));
                }
                e.target.value = "";
              }}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save changes" : "Record expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

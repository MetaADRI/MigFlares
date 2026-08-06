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
import { inventoryService } from "@/services/inventory.service";
import { INVENTORY_CATEGORIES } from "@/constants";
import type { InventoryItem } from "@/types";
import { cn } from "@/utils/cn";
import { inventoryItemSchema, type InventoryItemInput } from "@/utils/validation";

interface InventoryItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItem | null;
  onSaved: (item: InventoryItem) => void;
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

/** Create & edit inventory item dialog. */
export function InventoryItemModal({ open, onOpenChange, item, onSaved }: InventoryItemModalProps) {
  const isEdit = Boolean(item);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    reset,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<InventoryItemInput>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: {
      name: "",
      sku: "",
      category: "CLEANING_CHEMICALS",
      supplier: "",
      unit: "ml",
      costPrice: 0,
      sellingPrice: 0,
      quantityAvailable: 0,
      minimumQuantity: 0,
      maximumQuantity: 0,
      reorderLevel: 0,
      storageLocation: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: item?.name ?? "",
        sku: item?.sku ?? "",
        category: item?.category ?? "CLEANING_CHEMICALS",
        supplier: item?.supplier ?? "",
        unit: item?.unit ?? "ml",
        costPrice: item?.costPrice ?? 0,
        sellingPrice: item?.sellingPrice ?? 0,
        quantityAvailable: item?.quantityAvailable ?? 0,
        minimumQuantity: item?.minimumQuantity ?? 0,
        maximumQuantity: item?.maximumQuantity ?? 0,
        reorderLevel: item?.reorderLevel ?? 0,
        storageLocation: item?.storageLocation ?? "",
      });
    }
  }, [open, item, reset]);

  const onSubmit = async (values: InventoryItemInput) => {
    setSubmitting(true);
    try {
      const saved = isEdit
        ? await inventoryService.update(item!.id, values)
        : await inventoryService.create(values);
      toast.success(isEdit ? "Item updated" : "Item added");
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Inventory Item" : "Add Inventory Item"}</DialogTitle>
          <DialogDescription>
            Track stock levels, cost and reorder points for every product.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product name" error={errors.name?.message}>
              <Input placeholder="e.g. Car Wash Soap" {...register("name")} />
            </Field>
            <Field label="SKU" error={errors.sku?.message}>
              <Input placeholder="e.g. CHM-008" {...register("sku")} />
            </Field>
            <Field label="Category" error={errors.category?.message}>
              <Select value={watch("category")} onValueChange={(v) => setValue("category", v as InventoryItemInput["category"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {INVENTORY_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Supplier" error={errors.supplier?.message}>
              <Input placeholder="e.g. Lusaka Chem Supplies" {...register("supplier")} />
            </Field>
            <Field label="Unit" error={errors.unit?.message}>
              <Input placeholder="ml, L, g, unit" {...register("unit")} />
            </Field>
            <Field label="Storage location" error={errors.storageLocation?.message}>
              <Input placeholder="e.g. Shelf A1" {...register("storageLocation")} />
            </Field>
            <Field label="Cost price (ZMW)" error={errors.costPrice?.message}>
              <Input type="number" min={0} step="0.01" {...register("costPrice")} />
            </Field>
            <Field label="Selling price (ZMW)" error={errors.sellingPrice?.message}>
              <Input type="number" min={0} step="0.01" {...register("sellingPrice")} />
            </Field>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
            <p className="mb-3 text-sm font-medium text-foreground">Stock levels</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Quantity available" error={errors.quantityAvailable?.message}>
                <Input type="number" min={0} step="0.01" {...register("quantityAvailable")} />
              </Field>
              <Field label="Minimum quantity" error={errors.minimumQuantity?.message}>
                <Input type="number" min={0} step="0.01" {...register("minimumQuantity")} />
              </Field>
              <Field label="Maximum quantity" error={errors.maximumQuantity?.message}>
                <Input type="number" min={0} step="0.01" {...register("maximumQuantity")} />
              </Field>
              <Field label="Reorder level" error={errors.reorderLevel?.message}>
                <Input type="number" min={0} step="0.01" {...register("reorderLevel")} />
              </Field>
            </div>
            <p className={cn("mt-3 text-xs text-muted-foreground")}>
              Low-stock alerts trigger when quantity available drops to or below the reorder level.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save changes" : "Add item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

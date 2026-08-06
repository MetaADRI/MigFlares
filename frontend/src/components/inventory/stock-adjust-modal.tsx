import { useEffect, useState } from "react";
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
import { inventoryService } from "@/services/inventory.service";
import type { InventoryItem } from "@/types";
import { stockAdjustSchema, type StockAdjustInput } from "@/utils/validation";

interface StockAdjustModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  onSaved: (item: InventoryItem) => void;
}

const ADJUST_TYPES: { value: StockAdjustInput["type"]; label: string; description: string }[] = [
  { value: "RESTOCK", label: "Restock", description: "Add stock (e.g. a new delivery)" },
  { value: "ISSUE", label: "Reduce stock", description: "Remove stock (e.g. used on the floor)" },
  { value: "WRITE_OFF", label: "Write off", description: "Damaged, expired or lost stock" },
  { value: "ADJUSTMENT", label: "Adjustment", description: "Set the balance to a new value" },
];

/** Stock adjustment dialog — restock, reduce, write-off or adjust. */
export function StockAdjustModal({ open, onOpenChange, item, onSaved }: StockAdjustModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    reset,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<StockAdjustInput>({
    resolver: zodResolver(stockAdjustSchema),
    defaultValues: { type: "RESTOCK", quantity: 0, reason: "" },
  });

  const type = watch("type");

  useEffect(() => {
    if (open) reset({ type: "RESTOCK", quantity: 0, reason: "" });
  }, [open, reset]);

  const onSubmit = async (values: StockAdjustInput) => {
    if (!item) return;
    if (values.type !== "ADJUSTMENT" && values.quantity === 0) {
      toast.error("Enter a quantity greater than zero");
      return;
    }
    setSubmitting(true);
    try {
      const saved = await inventoryService.adjust(item.id, values);
      toast.success("Stock updated");
      onSaved(saved);
      onOpenChange(false);
    } catch {
      toast.error("Failed to update stock");
    } finally {
      setSubmitting(false);
    }
  };

  const selected = ADJUST_TYPES.find((t) => t.value === type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Stock adjustment</DialogTitle>
          <DialogDescription>
            {item ? (
              <>
                <span className="font-medium text-foreground">{item.name}</span> ·{" "}
                {item.quantityAvailable} {item.unit} currently available
              </>
            ) : (
              "Adjust the quantity available."
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {ADJUST_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setValue("type", t.value)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all ${
                    type === t.value
                      ? "border-primary bg-orange-50 text-primary shadow-sm"
                      : "border-border/70 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {t.label}
                  <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                    {t.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adj-qty">
              {type === "ADJUSTMENT" ? "New balance" : "Quantity"}
            </Label>
            <Input
              id="adj-qty"
              type="number"
              min={0}
              step="0.01"
              placeholder="0"
              {...register("quantity")}
            />
            {errors.quantity ? (
              <p className="text-xs text-red-500">{errors.quantity.message}</p>
            ) : (
              selected ? (
                <p className="text-xs text-muted-foreground">
                  {type === "ADJUSTMENT"
                    ? `Stock will be set to this exact value.`
                    : `${selected.label.toLowerCase()} will ${type === "RESTOCK" ? "add to" : "subtract from"} the current balance.`}
                </p>
              ) : null
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adj-reason">Reason</Label>
            <Input
              id="adj-reason"
              placeholder="e.g. Weekly delivery from Lusaka Chem"
              {...register("reason")}
            />
            {errors.reason ? <p className="text-xs text-red-500">{errors.reason.message}</p> : null}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Apply
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

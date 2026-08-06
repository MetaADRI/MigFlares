import { useEffect, useState, type ReactNode } from "react";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Plus, Trash2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SERVICE_CATEGORIES,
  SERVICE_COLOURS,
  SERVICE_ICONS,
} from "@/constants";
import { inventoryService } from "@/services/inventory.service";
import { servicesService } from "@/services/services.service";
import type { InventoryItem, Service } from "@/types";
import { cn } from "@/utils/cn";
import { serviceSchema, type ServiceInput } from "@/utils/validation";

interface ServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
  onSaved: (service: Service) => void;
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

/** Create & edit service dialog with inventory requirements. */
export function ServiceModal({ open, onOpenChange, service, onSaved }: ServiceModalProps) {
  const isEdit = Boolean(service);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    if (!open) return;
    inventoryService
      .list({ pageSize: 1000 })
      .then((res) => setItems(res.data))
      .catch(() => setItems([]));
  }, [open]);

  const {
    register,
    control,
    setValue,
    watch,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<ServiceInput>({
    resolver: zodResolver(serviceSchema) as Resolver<ServiceInput>,
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      durationMin: 15,
      category: "EXTERIOR",
      icon: "Droplets",
      colour: "#F47B20",
      displayOrder: 0,
      isActive: true,
      inventoryRequired: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "inventoryRequired",
  });

  const colour = watch("colour");
  const icon = watch("icon") ?? "";
  const isActive = watch("isActive");

  useEffect(() => {
    if (open) {
      reset({
        name: service?.name ?? "",
        description: service?.description ?? "",
        price: service?.price ?? 0,
        durationMin: service?.durationMin ?? 15,
        category: service?.category ?? "EXTERIOR",
        icon: service?.icon ?? "Droplets",
        colour: service?.colour ?? "#F47B20",
        displayOrder: service?.displayOrder ?? 0,
        isActive: service?.isActive ?? true,
        inventoryRequired:
          service?.inventoryRequired.map((r) => ({
            inventoryItemId: r.inventoryItemId,
            quantity: r.quantity,
          })) ?? [],
      });
    }
  }, [open, service, reset]);

  const onSubmit = async (values: ServiceInput) => {
    setSubmitting(true);
    try {
      const saved = isEdit
        ? await servicesService.update(service!.id, values)
        : await servicesService.create(values);
      toast.success(isEdit ? "Service updated" : "Service added");
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const chosenIds = new Set(fields.map((f) => f.inventoryItemId).filter(Boolean));
  const availableItems = items.filter((i) => !chosenIds.has(i.id));
  // Each row's options = everything not chosen by another row, plus its own pick.
  const optionsFor = (field: (typeof fields)[number]) =>
    items.filter((i) => !chosenIds.has(i.id) || field.inventoryItemId === i.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Service" : "Add New Service"}</DialogTitle>
          <DialogDescription>
            Define pricing, presentation and the inventory each service consumes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Service name" error={errors.name?.message}>
                <Input placeholder="e.g. Full Wash & Vacuum" {...register("name")} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Description" error={errors.description?.message}>
                <Textarea
                  placeholder="What does this service include?"
                  rows={2}
                  {...register("description")}
                />
              </Field>
            </div>
            <Field label="Price (ZMW)" error={errors.price?.message}>
              <Input type="number" min={0} step="0.5" placeholder="0.00" {...register("price")} />
            </Field>
            <Field label="Estimated duration (min)" error={errors.durationMin?.message}>
              <Input type="number" min={0} {...register("durationMin")} />
            </Field>
            <Field label="Category" error={errors.category?.message}>
              <Select value={watch("category")} onValueChange={(v) => setValue("category", v as ServiceInput["category"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Display order" error={errors.displayOrder?.message}>
              <Input type="number" min={0} {...register("displayOrder")} />
            </Field>
          </div>

          {/* Icon picker */}
          <Field label="Icon">
            <div className="grid grid-cols-7 gap-1.5">
              {SERVICE_ICONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  title={label}
                  onClick={() => setValue("icon", value)}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-xl border transition-all",
                    icon === value
                      ? "border-primary bg-orange-50 text-primary shadow-sm"
                      : "border-border/70 text-muted-foreground hover:border-primary/40 hover:text-primary",
                  )}
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </Field>

          {/* Colour picker */}
          <Field label="Brand colour">
            <div className="flex flex-wrap items-center gap-2">
              {SERVICE_COLOURS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setValue("colour", hex)}
                  className={cn(
                    "grid size-8 place-items-center rounded-full border-2 transition-transform hover:scale-110",
                    colour === hex ? "border-foreground" : "border-transparent",
                  )}
                  style={{ backgroundColor: hex }}
                  aria-label={`Colour ${hex}`}
                >
                  {colour === hex ? <Check className="size-4 text-white drop-shadow" /> : null}
                </button>
              ))}
            </div>
          </Field>

          {/* Inventory requirements */}
          <div className="space-y-2.5 rounded-xl border border-border/70 bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Inventory required</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  What stock is consumed per job — e.g. Soap 100 ml.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={availableItems.length === 0}
                onClick={() => append({ inventoryItemId: "", quantity: 1 })}
              >
                <Plus /> Add item
              </Button>
            </div>

            {fields.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                No inventory linked. Add an item to track consumption.
              </p>
            ) : (
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1.5">
                      <Label className="sr-only">Inventory item</Label>
                      <Select
                        value={field.inventoryItemId}
                        onValueChange={(v) => setValue(`inventoryRequired.${index}.inventoryItemId`, v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {optionsFor(field).map((i) => (
                            <SelectItem key={i.id} value={i.id}>
                              {i.name} ({i.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-28 space-y-1.5">
                      <Label className="sr-only">Quantity</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Qty"
                        {...register(`inventoryRequired.${index}.quantity`)}
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-9 shrink-0 text-muted-foreground hover:text-red-600"
                      onClick={() => remove(index)}
                      aria-label="Remove item"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/70 p-3.5">
            <div>
              <Label>Active service</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Inactive services are hidden from the wash form.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={(v) => setValue("isActive", v)} />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save changes" : "Add service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

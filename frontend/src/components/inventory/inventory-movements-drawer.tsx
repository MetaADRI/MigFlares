import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { inventoryService } from "@/services/inventory.service";
import { MOVEMENT_TYPE_META } from "@/constants";
import type { InventoryItem, InventoryMovement } from "@/types";
import { formatDateTime } from "@/utils/format";

interface InventoryMovementsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
}

/** Stock movement history for a single item. */
export function InventoryMovementsDrawer({ open, onOpenChange, item }: InventoryMovementsDrawerProps) {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !item) return;
    let cancelled = false;
    setLoading(true);
    inventoryService
      .movements(item.id)
      .then((m) => {
        if (!cancelled) setMovements(m);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, item]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-md">
        <ScrollArea className="h-full pr-3">
          <SheetHeader className="border-b border-border/60 pb-5 pr-8">
            <SheetTitle>{item?.name ?? "Inventory"}</SheetTitle>
            <SheetDescription className="flex items-center gap-1.5">
              <History className="size-3.5" />
              Stock movement history
            </SheetDescription>
          </SheetHeader>

          <div className="p-5">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : movements.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                No stock movements recorded yet.
              </p>
            ) : (
              <div className="relative space-y-4 pl-5">
                <div className="absolute bottom-2 left-[7px] top-2 w-px bg-border" />
                {movements.map((m) => {
                  const meta = MOVEMENT_TYPE_META[m.type];
                  return (
                    <div key={m.id} className="relative">
                      <span className="absolute -left-5 top-1.5 size-[15px] rounded-full border-2 border-background bg-muted-foreground/50" />
                      <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge className={meta.className}>{meta.label}</Badge>
                          <span className="font-semibold text-foreground">
                            {meta.sign}
                            {m.quantity} → {m.balanceAfter}
                          </span>
                        </div>
                        {m.reason ? (
                          <p className="mt-1.5 text-xs text-muted-foreground">{m.reason}</p>
                        ) : null}
                        <p className="mt-1.5 text-[11px] text-muted-foreground">
                          {formatDateTime(m.createdAt)}
                          {m.createdByName ? ` · by ${m.createdByName}` : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

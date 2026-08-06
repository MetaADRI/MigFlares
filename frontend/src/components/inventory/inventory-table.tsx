import { History, MoreHorizontal, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/common/loading-state";
import { INVENTORY_CATEGORY_LABEL } from "@/constants";
import type { InventoryItem } from "@/types";
import { formatCurrency, formatDate } from "@/utils/format";

interface InventoryTableProps {
  items: InventoryItem[];
  loading: boolean;
  sortBy: string;
  sortDir: "asc" | "desc";
  onSort: (key: string) => void;
  onView: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
  onAdjust: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
}

function SortableHead({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <TableHead>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
      >
        {label}
        <span className={active ? "text-primary" : "opacity-40"}>
          {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </TableHead>
  );
}

/** Stock level bar colouring based on health. */
function stockTone(item: InventoryItem): { bar: string; text: string } {
  if (item.outOfStock) return { bar: "bg-red-500", text: "text-red-600" };
  if (item.lowStock) return { bar: "bg-amber-500", text: "text-amber-600" };
  return { bar: "bg-emerald-500", text: "text-emerald-600" };
}

/** Inventory items table. */
export function InventoryTable({
  items,
  loading,
  sortBy,
  sortDir,
  onSort,
  onView,
  onEdit,
  onAdjust,
  onDelete,
}: InventoryTableProps) {
  if (loading) return <TableSkeleton rows={7} />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Supplier</TableHead>
          <SortableHead label="Stock" active={sortBy === "quantityAvailable"} dir={sortDir} onClick={() => onSort("quantityAvailable")} />
          <SortableHead label="Cost" active={sortBy === "costPrice"} dir={sortDir} onClick={() => onSort("costPrice")} />
          <TableHead>Value</TableHead>
          <TableHead>Last restocked</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const tone = stockTone(item);
          const max = Math.max(item.maximumQuantity, item.reorderLevel * 2, 1);
          const pct = Math.min(100, Math.round((item.quantityAvailable / max) * 100));
          return (
            <TableRow key={item.id} className="group cursor-pointer" onClick={() => onView(item)}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div
                    className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                      item.outOfStock ? "bg-red-50 text-red-500" : item.lowStock ? "bg-amber-50 text-amber-600" : "bg-sky-50 text-sky-600"
                    }`}
                  >
                    <Package className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{item.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.sku}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{INVENTORY_CATEGORY_LABEL[item.category]}</Badge>
              </TableCell>
              <TableCell className="max-w-40 truncate text-muted-foreground">{item.supplier ?? "—"}</TableCell>
              <TableCell>
                <div className="min-w-32">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`font-semibold ${tone.text}`}>
                      {item.quantityAvailable} {item.unit}
                    </span>
                    {item.outOfStock ? (
                      <Badge variant="destructive">Out</Badge>
                    ) : item.lowStock ? (
                      <Badge variant="warning">Low</Badge>
                    ) : null}
                  </div>
                  <Progress value={pct} className="mt-1.5 h-1.5" indicatorClassName={tone.bar} />
                  <p className="mt-0.5 text-[10px] text-muted-foreground">reorder at {item.reorderLevel}</p>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatCurrency(item.costPrice)}</TableCell>
              <TableCell className="font-medium text-foreground">
                {formatCurrency(item.quantityAvailable * item.costPrice)}
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(item.lastRestocked)}</TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{item.name}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onView(item)}>
                      <History /> Movements
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAdjust(item)}>
                      <Plus /> Adjust stock
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(item)}>
                      <Pencil /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(item)}>
                      <Trash2 /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

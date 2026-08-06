import { Clock, Copy, MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { SERVICE_CATEGORIES, serviceIcon } from "@/constants";
import type { Service } from "@/types";
import { formatCurrency } from "@/utils/format";

interface ServiceTableProps {
  services: Service[];
  loading: boolean;
  sortBy: string;
  sortDir: "asc" | "desc";
  onSort: (key: string) => void;
  onEdit: (service: Service) => void;
  onDuplicate: (service: Service) => void;
  onToggle: (service: Service) => void;
  onDelete: (service: Service) => void;
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

/** Table layout for the Services catalogue. */
export function ServiceTable({
  services,
  loading,
  sortBy,
  sortDir,
  onSort,
  onEdit,
  onDuplicate,
  onToggle,
  onDelete,
}: ServiceTableProps) {
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Service</TableHead>
          <SortableHead label="Price" active={sortBy === "price"} dir={sortDir} onClick={() => onSort("price")} />
          <TableHead>Duration</TableHead>
          <TableHead>Category</TableHead>
          <SortableHead label="Order" active={sortBy === "displayOrder"} dir={sortDir} onClick={() => onSort("displayOrder")} />
          <TableHead>Inventory</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {services.map((service) => {
          const Icon = serviceIcon(service.icon);
          const categoryLabel = SERVICE_CATEGORIES.find((c) => c.value === service.category)?.label;
          return (
            <TableRow key={service.id} className="group">
              <TableCell>
                <div className="flex items-center gap-3">
                  <div
                    className="grid size-9 shrink-0 place-items-center rounded-lg text-white"
                    style={{ backgroundColor: service.colour }}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{service.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{service.description ?? "—"}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-semibold text-foreground">{formatCurrency(service.price)}</TableCell>
              <TableCell className="text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {service.durationMin ? `${service.durationMin} min` : "—"}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{categoryLabel}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">#{service.displayOrder}</TableCell>
              <TableCell className="text-muted-foreground">
                {service.inventoryRequired.length > 0
                  ? `${service.inventoryRequired.length} item${service.inventoryRequired.length > 1 ? "s" : ""}`
                  : "—"}
              </TableCell>
              <TableCell>
                <Badge
                  variant={service.isActive ? "success" : "secondary"}
                  dotClassName={service.isActive ? "bg-emerald-500" : "bg-zinc-400"}
                >
                  {service.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{service.name}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEdit(service)}>
                      <Pencil /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate(service)}>
                      <Copy /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggle(service)}>
                      <Power /> {service.isActive ? "Deactivate" : "Activate"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(service)}>
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

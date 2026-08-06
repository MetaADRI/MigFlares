import { Clock, Copy, MoreHorizontal, Package, Pencil, Power, Trash2 } from "lucide-react";
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
import { SERVICE_CATEGORIES, serviceIcon } from "@/constants";
import type { Service } from "@/types";
import { formatCurrency } from "@/utils/format";

interface ServiceCardProps {
  service: Service;
  onEdit: (service: Service) => void;
  onDuplicate: (service: Service) => void;
  onToggle: (service: Service) => void;
  onDelete: (service: Service) => void;
}

/** Grid card for the Services catalogue. */
export function ServiceCard({ service, onEdit, onDuplicate, onToggle, onDelete }: ServiceCardProps) {
  const Icon = serviceIcon(service.icon);
  const categoryLabel = SERVICE_CATEGORIES.find((c) => c.value === service.category)?.label;

  return (
    <div className="group relative flex flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_2px_6px_rgba(0,0,0,0.05),0_16px_32px_-16px_rgba(0,0,0,0.14)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="grid size-11 place-items-center rounded-xl text-white shadow-sm"
            style={{ backgroundColor: service.colour }}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-foreground">{service.name}</h3>
            <p className="text-xs text-muted-foreground">{categoryLabel}</p>
          </div>
        </div>
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
      </div>

      <p className="mt-3 line-clamp-2 min-h-10 text-sm text-muted-foreground">
        {service.description ?? "No description."}
      </p>

      {service.inventoryRequired.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {service.inventoryRequired.map((r) => (
            <span
              key={r.inventoryItemId}
              className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              <Package className="size-3" />
              {r.name} {r.quantity} {r.unit}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex items-end justify-between border-t border-border/60 pt-3.5">
        <div>
          <p className="text-lg font-bold text-foreground">{formatCurrency(service.price)}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {service.durationMin ? `${service.durationMin} min` : "—"}
          </p>
        </div>
        <Badge
          variant={service.isActive ? "success" : "secondary"}
          dotClassName={service.isActive ? "bg-emerald-500" : "bg-zinc-400"}
        >
          {service.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>
    </div>
  );
}

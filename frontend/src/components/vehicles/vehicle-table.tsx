import { Car, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/common/status-badge";
import { VEHICLE_STATUS_META, VEHICLE_TYPE_LABEL } from "@/constants";
import type { Vehicle } from "@/types";

interface VehicleTableProps {
  vehicles: Vehicle[];
  loading: boolean;
  onView: (vehicle: Vehicle) => void;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
}

export function VehicleTable({ vehicles, loading, onView, onEdit, onDelete }: VehicleTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Vehicle</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Colour</TableHead>
          <TableHead className="text-center">Wash History</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-12 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i} className="hover:bg-transparent">
                <TableCell colSpan={7}>
                  <Skeleton className="h-10 w-full" />
                </TableCell>
              </TableRow>
            ))
          : vehicles.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-border/60 bg-muted/50 text-muted-foreground">
                      {vehicle.imageUrl ? (
                        <img
                          src={vehicle.imageUrl}
                          alt={vehicle.plateNumber}
                          className="size-full rounded-xl object-cover"
                        />
                      ) : (
                        <Car className="size-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold tracking-wide text-foreground">
                        {vehicle.plateNumber}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {vehicle.make} {vehicle.model}
                        {vehicle.year ? ` · ${vehicle.year}` : ""}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-sm font-medium text-foreground">{vehicle.ownerName}</p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {VEHICLE_TYPE_LABEL[vehicle.vehicleType]}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <span
                      className="size-3.5 shrink-0 rounded-full border border-border/70"
                      style={{ backgroundColor: vehicle.color }}
                      aria-hidden
                    />
                    {vehicle.color}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
                    {vehicle.washCount}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge meta={VEHICLE_STATUS_META[vehicle.status]} />
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Vehicle actions">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => onView(vehicle)}>
                        <Eye /> View details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(vehicle)}>
                        <Pencil /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(vehicle)}
                      >
                        <Trash2 /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
      </TableBody>
    </Table>
  );
}

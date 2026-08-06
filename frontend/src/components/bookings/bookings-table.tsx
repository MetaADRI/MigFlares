import {
  Ban,
  CheckCircle2,
  Edit,
  Eye,
  MoreHorizontal,
  UserX,
} from "lucide-react";
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
import { BOOKING_STATUS_META } from "@/constants";
import type { Booking } from "@/types";
import { cn } from "@/utils/cn";
import { formatDateTime } from "@/utils/format";

interface BookingsTableProps {
  bookings: Booking[];
  loading: boolean;
  canManage: boolean;
  onEdit: (booking: Booking) => void;
  onConfirm: (booking: Booking) => void;
  onComplete: (booking: Booking) => void;
  onNoShow: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
}

const CANCELABLE = ["PENDING", "CONFIRMED"];

export function BookingsTable({
  bookings,
  loading,
  canManage,
  onEdit,
  onConfirm,
  onComplete,
  onNoShow,
  onCancel,
}: BookingsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Booking</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Vehicle</TableHead>
          <TableHead>Service</TableHead>
          <TableHead>Attendant</TableHead>
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
          : bookings.map((booking) => {
              const meta = BOOKING_STATUS_META[booking.status];
              const editable = booking.status === "PENDING" || booking.status === "CONFIRMED";
              return (
                <TableRow
                  key={booking.id}
                  className={cn(booking.status === "CANCELLED" || booking.status === "NO_SHOW" ? "opacity-70" : "")}
                >
                  <TableCell>
                    <p className="font-mono text-xs font-bold tracking-wide text-foreground">
                      {booking.reference}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(booking.scheduledAt)}</p>
                    <p className="text-[11px] text-muted-foreground">{booking.durationMin} min</p>
                  </TableCell>
                  <TableCell>
                    <p className="truncate text-sm font-medium text-foreground">{booking.customerName}</p>
                    {booking.customerPhone ? (
                      <p className="text-xs text-muted-foreground">{booking.customerPhone}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <p className="font-mono text-xs font-semibold text-foreground">{booking.plateNumber}</p>
                    <p className="text-xs text-muted-foreground">{booking.vehicleSummary}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-foreground">{booking.serviceName}</p>
                  </TableCell>
                  <TableCell>
                    {booking.employeeName ? (
                      <p className="text-sm text-foreground">{booking.employeeName}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Unassigned</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge meta={meta} />
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage && editable ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label="Booking actions">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => onEdit(booking)}>
                            <Edit /> Edit / reschedule
                          </DropdownMenuItem>
                          {booking.status === "PENDING" ? (
                            <DropdownMenuItem onSelect={() => onConfirm(booking)}>
                              <CheckCircle2 /> Confirm
                            </DropdownMenuItem>
                          ) : null}
                          {booking.status === "CONFIRMED" ? (
                            <DropdownMenuItem onSelect={() => onComplete(booking)}>
                              <CheckCircle2 /> Mark completed
                            </DropdownMenuItem>
                          ) : null}
                          {CANCELABLE.includes(booking.status) ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => onNoShow(booking)}>
                                <UserX /> Mark no-show
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 focus:bg-red-50 focus:text-red-700"
                                onSelect={() => onCancel(booking)}
                              >
                                <Ban /> Cancel booking
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button variant="ghost" size="icon-sm" onClick={() => onEdit(booking)} aria-label="View booking">
                        <Eye className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
      </TableBody>
    </Table>
  );
}

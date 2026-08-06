import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BOOKING_STATUS_META } from "@/constants";
import type { Booking } from "@/types";
import { cn } from "@/utils/cn";
import { formatTime, isSameDay } from "@/utils/format";

interface BookingsCalendarProps {
  bookings: Booking[];
  mode: "day" | "week";
  viewDate: Date;
  onNavigate: (date: Date) => void;
  onSlotClick: (date: Date) => void;
  onBookingClick: (booking: Booking) => void;
  canManage: boolean;
}

const DAY_START = 7; // 07:00 — business hours
const DAY_END = 19; // 19:00
const TOTAL_MINUTES = (DAY_END - DAY_START) * 60;

const HOUR_LABELS = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i);

/** Monday-first week containing the given date. */
function weekDays(date: Date): Date[] {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return Array.from({ length: 7 }, (_, i) => {
    const next = new Date(d);
    next.setDate(d.getDate() + i);
    return next;
  });
}

function dayLabel(date: Date): string {
  return date.toLocaleDateString("en-ZM", { weekday: "short", day: "numeric", month: "short" });
}

function headerLabel(date: Date, mode: "day" | "week"): string {
  if (mode === "day") return dayLabel(date);
  const days = weekDays(date);
  return `${dayLabel(days[0])} – ${dayLabel(days[6])}`;
}

export function BookingsCalendar({
  bookings,
  mode,
  viewDate,
  onNavigate,
  onSlotClick,
  onBookingClick,
  canManage,
}: BookingsCalendarProps) {
  const days = mode === "day" ? [viewDate] : weekDays(viewDate);
  const rangeEnd = days[days.length - 1];

  const navigate = (offset: number) => {
    const next = new Date(viewDate);
    next.setDate(next.getDate() + (mode === "day" ? offset : offset * 7));
    onNavigate(next);
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(1)}>
            <ChevronRight className="size-4" />
          </Button>
          <span className="ml-2 font-display text-sm font-semibold">{headerLabel(viewDate, mode)}</span>
        </div>
        {canManage ? (
          <Button size="sm" onClick={() => onSlotClick(new Date())}>
            <Plus className="size-4" /> New booking
          </Button>
        ) : null}
      </div>

      {/* Grid */}
      <div
        className="overflow-x-auto rounded-2xl border border-border/70 bg-card"
        style={{ height: 11 * 44 }}
      >
        <div className={cn("grid min-w-[560px] h-full", mode === "day" ? "grid-cols-[56px_1fr]" : "grid-cols-[56px_repeat(7,1fr)]")}>
          {/* Time gutter */}
          <div className="relative border-r border-border/70">
            {HOUR_LABELS.map((hour) => (
              <div
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground"
                style={{ top: ((hour - DAY_START) / (DAY_END - DAY_START)) * 100 + "%" }}
              >
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, colIndex) => {
            const dayBookings = bookings
              .filter((b) => isSameDay(new Date(b.scheduledAt), day))
              .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
            const isToday = isSameDay(day, new Date());
            const cellEnd = new Date(day);
            cellEnd.setHours(DAY_END, 0, 0, 0);

            return (
              <div
                key={colIndex}
                className={cn(
                  "relative border-r border-border/70 last:border-r-0",
                  mode === "day" ? "col-span-1" : "",
                )}
                onClick={() => {
                  if (canManage) onSlotClick(day);
                }}
              >
                {/* Hour lines */}
                {HOUR_LABELS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute inset-x-0 border-t border-border/40"
                    style={{ top: ((hour - DAY_START) / (DAY_END - DAY_START)) * 100 + "%" }}
                  />
                ))}

                {/* Day header */}
                <div
                  className={cn(
                    "pointer-events-none sticky top-0 z-10 border-b border-border/70 bg-card/90 px-2 py-1.5 text-center text-[11px] font-semibold backdrop-blur",
                    isToday ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {dayLabel(day)}
                </div>

                {/* Bookings */}
                {dayBookings.map((b) => {
                  const start = new Date(b.scheduledAt);
                  const minutes = Math.max(10, b.durationMin);
                  const startFrac = (start.getHours() + start.getMinutes() / 60 - DAY_START) / (DAY_END - DAY_START);
                  const heightFrac = minutes / TOTAL_MINUTES;
                  const meta = BOOKING_STATUS_META[b.status];
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBookingClick(b);
                      }}
                      className={cn(
                        "absolute inset-x-1 z-[5] cursor-pointer overflow-hidden rounded-lg border px-2 py-1 text-left shadow-sm transition-all hover:z-[6] hover:shadow-md",
                        meta.className,
                        (b.status === "CANCELLED" || b.status === "NO_SHOW") && "opacity-70",
                      )}
                      style={{
                        top: `calc(${(startFrac * 100).toFixed(2)}% + 22px)`,
                        height: `calc(${(heightFrac * 100).toFixed(2)}% - 4px)`,
                        minHeight: 22,
                      }}
                    >
                      <div className="flex items-center gap-1 text-[11px] font-bold leading-tight">
                        <span className={cn("size-1.5 shrink-0 rounded-full", meta.dot)} />
                        {formatTime(b.scheduledAt)}
                      </div>
                      <div className="truncate text-[11px] font-semibold leading-tight">
                        {b.plateNumber} · {b.customerName}
                      </div>
                      <div className="truncate text-[10px] leading-tight opacity-80">{b.serviceName}</div>
                      {b.employeeName ? (
                        <div className="truncate text-[10px] leading-tight opacity-70">{b.employeeName}</div>
                      ) : null}
                    </button>
                  );
                })}

                {/* Empty-state hint */}
                {canManage && dayBookings.length === 0 && colIndex === (mode === "day" ? 0 : 0) ? (
                  <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center text-[11px] text-muted-foreground/50">
                    {dayBookings.length === 0 ? "Click to book" : ""}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        {Object.entries(BOOKING_STATUS_META).map(([key, meta]) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", meta.dot)} /> {meta.label}
          </span>
        ))}
        <span className="ml-auto hidden sm:inline">
          {rangeEnd.getFullYear()} · Showing {mode === "day" ? "a single day" : "a full week"}
        </span>
      </div>
    </div>
  );
}

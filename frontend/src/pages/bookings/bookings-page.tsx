import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CalendarRange, List } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingsCalendar } from "@/components/bookings/bookings-calendar";
import { BookingsTable } from "@/components/bookings/bookings-table";
import { BookingModal } from "@/components/bookings/booking-modal";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PaginationBar } from "@/components/common/pagination-bar";
import { SearchInput } from "@/components/common/search-input";
import { usePermission } from "@/context/permission-context";
import { bookingsService } from "@/services/bookings.service";
import type { Booking } from "@/types";
import type { Paginated } from "@/types/api";
import { startOfDay, startOfWeek } from "@/utils/format";

const PAGE_SIZE = 10;

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No Shows" },
];

/** Local "yyyy-MM-ddTHH:mm" for a datetime-local input. */
function localDateTimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function slotDateFor(day: Date): string {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    const next = new Date(now);
    next.setMinutes(Math.ceil(next.getMinutes() / 30) * 30, 0, 0);
    return localDateTimeValue(next);
  }
  d.setHours(9, 0, 0, 0);
  return localDateTimeValue(d);
}

export default function BookingsPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission("bookings:manage");

  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [calMode, setCalMode] = useState<"day" | "week">("day");
  const [viewDate, setViewDate] = useState(() => new Date());

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Booking> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);

  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);

  const range = useMemo(() => {
    const start = calMode === "day" ? startOfDay(viewDate) : startOfWeek(viewDate);
    const end = new Date(start);
    end.setDate(end.getDate() + (calMode === "day" ? 1 : 7));
    end.setMilliseconds(-1);
    return { start, end };
  }, [calMode, viewDate]);

  const loadCalendar = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    bookingsService
      .list({
        pageSize: 1000,
        dateFrom: range.start.toISOString(),
        dateTo: range.end.toISOString(),
      })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load bookings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, refreshKey]);

  const loadList = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    bookingsService
      .list({
        page: view === "list" ? page : 1,
        pageSize: PAGE_SIZE,
        search: view === "list" ? search : undefined,
        status: view === "list" && status !== "all" ? status : undefined,
      })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load bookings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, page, search, status, refreshKey]);

  useEffect(() => {
    if (view === "calendar") return loadCalendar();
    return loadList();
  }, [view, loadCalendar, loadList]);

  useEffect(() => {
    if (view === "list") setPage(1);
  }, [search, status, view]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const openCreate = (day?: Date) => {
    setEditing(null);
    setDefaultDate(day ? slotDateFor(day) : undefined);
    setModalOpen(true);
  };

  const openEdit = (booking: Booking) => {
    if (booking.status === "PENDING" || booking.status === "CONFIRMED") {
      setEditing(booking);
      setDefaultDate(undefined);
      setModalOpen(true);
    } else {
      toast.info(`${booking.reference} is ${booking.status.toLowerCase()} and can't be edited.`);
    }
  };

  const setBookingStatus = async (booking: Booking, next: Booking["status"], message: string) => {
    try {
      await bookingsService.updateStatus(booking.id, next);
      toast.success(`${booking.reference} ${message}`);
      refresh();
    } catch {
      toast.error("Failed to update booking");
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setBusy(true);
    try {
      await bookingsService.updateStatus(cancelTarget.id, "CANCELLED");
      toast.success(`${cancelTarget.reference} cancelled`);
      setCancelTarget(null);
      refresh();
    } catch {
      toast.error("Failed to cancel booking");
    } finally {
      setBusy(false);
    }
  };

  const isEmpty = view === "list" && !loading && data?.total === 0 && !search && status === "all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings & Appointments"
        description="Schedule wash slots, manage the calendar and track confirmations."
      >
        {canManage ? (
          <Button onClick={() => openCreate()}>
            <CalendarDays /> New Booking
          </Button>
        ) : null}
      </PageHeader>

      {/* View switcher */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={view} onValueChange={(v) => setView(v as "calendar" | "list")}>
          <TabsList className="w-full justify-start lg:w-auto">
            <TabsTrigger value="calendar">
              <CalendarRange /> Calendar
            </TabsTrigger>
            <TabsTrigger value="list">
              <List /> List
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {view === "list" ? (
          <div className="flex flex-col gap-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search reference, customer or plate…"
              className="w-full lg:w-72"
            />
            <Tabs value={status} onValueChange={setStatus}>
              <TabsList className="w-full justify-start overflow-x-auto lg:w-auto">
                {STATUS_TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        ) : null}
      </div>

      {view === "calendar" ? (
        <>
          <div className="flex items-center justify-between">
            <Tabs value={calMode} onValueChange={(v) => setCalMode(v as "day" | "week")}>
              <TabsList>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <BookingsCalendar
            bookings={data?.data ?? []}
            mode={calMode}
            viewDate={viewDate}
            onNavigate={setViewDate}
            onSlotClick={(day) => canManage && openCreate(day)}
            onBookingClick={openEdit}
            canManage={canManage}
          />
        </>
      ) : (
        <div className="rounded-2xl border border-border/70 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
          {isEmpty ? (
            <EmptyState
              icon={CalendarDays}
              title="No bookings yet"
              description="Reserve your first slot — pick a customer, vehicle, service and time and the calendar fills itself."
            >
              {canManage ? (
                <Button onClick={() => openCreate()}>
                  <CalendarDays /> Create a booking
                </Button>
              ) : null}
            </EmptyState>
          ) : !loading && data?.total === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No matching bookings"
              description="Try a different search or status filter."
            />
          ) : (
            <>
              <BookingsTable
                bookings={data?.data ?? []}
                loading={loading}
                canManage={canManage}
                onEdit={openEdit}
                onConfirm={(b) => void setBookingStatus(b, "CONFIRMED", "confirmed")}
                onComplete={(b) => void setBookingStatus(b, "COMPLETED", "marked completed")}
                onNoShow={(b) => void setBookingStatus(b, "NO_SHOW", "marked as no-show")}
                onCancel={setCancelTarget}
              />
              <div className="border-t border-border/60 px-4 py-3.5">
                <PaginationBar
                  page={data?.page ?? 1}
                  totalPages={data?.totalPages ?? 1}
                  total={data?.total ?? 0}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </div>
      )}

      <BookingModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSaved={() => refresh()}
        editing={editing}
        defaultDate={defaultDate}
      />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        title="Cancel this booking?"
        description={`Booking ${cancelTarget?.reference} for ${cancelTarget?.customerName} (${cancelTarget?.plateNumber}) on ${cancelTarget ? new Date(cancelTarget.scheduledAt).toLocaleString("en-ZM", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""} will be cancelled. This can't be undone.`}
        confirmLabel="Cancel booking"
        loading={busy}
        onConfirm={() => void handleCancel()}
      />
    </div>
  );
}

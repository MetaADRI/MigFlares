import { useCallback, useEffect, useState } from "react";
import { Eye, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PaginationBar } from "@/components/common/pagination-bar";
import { SearchInput } from "@/components/common/search-input";
import { TableSkeleton } from "@/components/common/loading-state";
import { ReceiptViewDialog } from "@/components/receipts/receipt-view-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { receiptsService } from "@/services/receipts.service";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_META } from "@/constants";
import type { Paginated } from "@/types/api";
import type { Receipt } from "@/types";
import { formatCurrency, formatDateTime } from "@/utils/format";

const PAGE_SIZE = 10;

export default function ReceiptsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [status, setStatus] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("issuedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Receipt> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [viewReceipt, setViewReceipt] = useState<Receipt | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    receiptsService
      .list({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        status: status === "all" ? undefined : status,
        paymentMethod: paymentMethod === "all" ? undefined : paymentMethod,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortBy,
        sortDir,
      })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load receipts");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, status, paymentMethod, dateFrom, dateTo, sortBy, sortDir, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, paymentMethod, dateFrom, dateTo, sortBy, sortDir]);

  useEffect(() => {
    return load();
  }, [load]);

  const handleChanged = (updated: Receipt) => {
    setViewReceipt(updated);
    setRefreshKey((k) => k + 1);
  };

  const isEmpty = !loading && data?.total === 0 && !debouncedSearch && status === "all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receipts"
        description="Every receipt issued on the floor — search, reprint, duplicate or void."
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search receipt no, customer, phone, plate or attendant…"
          className="w-full sm:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
              <SelectItem value="REFUNDED">Refunded</SelectItem>
              <SelectItem value="VOIDED">Voided</SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payment methods</SelectItem>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="From date"
            className="h-10 rounded-xl border border-border/70 bg-card px-3 text-sm shadow-sm outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="To date"
            className="h-10 rounded-xl border border-border/70 bg-card px-3 text-sm shadow-sm outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
          {status !== "all" || paymentMethod !== "all" || dateFrom || dateTo || debouncedSearch ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatus("all");
                setPaymentMethod("all");
                setDateFrom("");
                setDateTo("");
                setSearch("");
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
        <div className="lg:ml-auto">
          <Select
            value={`${sortBy}:${sortDir}`}
            onValueChange={(v) => {
              const [key, dir] = v.split(":");
              setSortBy(key);
              setSortDir((dir as "asc" | "desc") ?? "desc");
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="issuedAt:desc">Newest first</SelectItem>
              <SelectItem value="issuedAt:asc">Oldest first</SelectItem>
              <SelectItem value="total:desc">Highest amount</SelectItem>
              <SelectItem value="total:asc">Lowest amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border/70 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
        {isEmpty ? (
          <EmptyState
            icon={ReceiptText}
            title="No receipts yet"
            description="Receipts are generated automatically when a wash job is completed."
          />
        ) : loading ? (
          <TableSkeleton rows={7} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt no</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Attendant</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead className="text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.map((receipt) => {
                  const meta = PAYMENT_STATUS_META[receipt.status];
                  return (
                    <TableRow key={receipt.id} className="cursor-pointer group" onClick={() => setViewReceipt(receipt)}>
                      <TableCell className="font-mono text-sm font-semibold text-primary">
                        {receipt.receiptNo}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-foreground">{receipt.customerName}</p>
                        {receipt.customerPhone ? (
                          <p className="text-xs text-muted-foreground">{receipt.customerPhone}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-foreground">{receipt.plateNumber}</p>
                        <p className="text-xs text-muted-foreground">{receipt.vehicleSummary}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{receipt.employeeName ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {PAYMENT_METHOD_LABEL[receipt.paymentMethod]}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground">
                        {formatCurrency(receipt.total)}
                      </TableCell>
                      <TableCell>
                        <Badge className={meta.className} dotClassName={meta.dot}>
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(receipt.issuedAt)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground"
                          title="View receipt"
                          onClick={() => setViewReceipt(receipt)}
                        >
                          <Eye className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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

      <ReceiptViewDialog
        open={Boolean(viewReceipt)}
        onOpenChange={(open) => {
          if (!open) setViewReceipt(null);
        }}
        receipt={viewReceipt}
        onChanged={handleChanged}
      />
    </div>
  );
}

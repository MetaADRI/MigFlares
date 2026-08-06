import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Droplets, Droplet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PaginationBar } from "@/components/common/pagination-bar";
import { SearchInput } from "@/components/common/search-input";
import { ReceiptModal } from "@/components/wash-jobs/receipt-modal";
import { WashJobDetailsDrawer } from "@/components/wash-jobs/wash-job-details-drawer";
import { WashJobModal } from "@/components/wash-jobs/wash-job-modal";
import { WashJobsTable } from "@/components/wash-jobs/wash-jobs-table";
import { useDebounce } from "@/hooks/use-debounce";
import { washJobsService } from "@/services/wash-jobs.service";
import type { Receipt, WashJob } from "@/types";
import type { Paginated } from "@/types/api";

const PAGE_SIZE = 10;

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function WashJobsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [search, setSearch] = useState(() => {
    return new URLSearchParams(location.search).get("search") ?? "";
  });
  const debouncedSearch = useDebounce(search, 350);
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<WashJob> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [drawerJob, setDrawerJob] = useState<WashJob | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [cancelTarget, setCancelTarget] = useState<WashJob | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // URL-driven: ?new=1 opens the record-wash modal (dashboard quick action).
  useEffect(() => {
    if (new URLSearchParams(location.search).get("new") === "1") {
      setModalOpen(true);
      navigate("/wash-jobs", { replace: true });
    }
  }, [location.search, navigate]);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    washJobsService
      .list({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        status: status === "all" ? undefined : status,
      })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load wash jobs");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, status, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  useEffect(() => {
    return load();
  }, [load]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const showReceipt = async (job: WashJob) => {
    try {
      const r = await washJobsService.getReceipt(job.id);
      if (r) {
        setReceipt(r);
      } else {
        toast.info("No receipt for this job yet.");
      }
    } catch {
      toast.error("Failed to load receipt");
    }
  };

  const handleStart = async (job: WashJob) => {
    try {
      await washJobsService.updateStatus(job.id, "IN_PROGRESS");
      toast.success(`${job.reference} is now in progress`);
      refresh();
    } catch {
      toast.error("Failed to update job");
    }
  };

  const handleComplete = async (job: WashJob) => {
    try {
      const result = await washJobsService.updateStatus(job.id, "COMPLETED");
      refresh();
      if (result.receipt) {
        setReceipt(result.receipt);
        toast.success(`${job.reference} completed — receipt generated`);
      } else {
        toast.success(`${job.reference} completed`);
      }
    } catch {
      toast.error("Failed to complete job");
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await washJobsService.updateStatus(cancelTarget.id, "CANCELLED");
      toast.success(`${cancelTarget.reference} cancelled`);
      setCancelTarget(null);
      setDrawerJob(null);
      refresh();
    } catch {
      toast.error("Failed to cancel job");
    } finally {
      setCancelling(false);
    }
  };

  const isEmpty = !loading && data?.total === 0 && !debouncedSearch && status === "all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wash Jobs"
        description="Record washes, manage the bay and generate receipts on completion."
      >
        <Button onClick={() => setModalOpen(true)}>
          <Droplets /> New Wash Job
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList className="w-full justify-start overflow-x-auto lg:w-auto">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search job, customer or plate…"
          className="w-full lg:w-72"
        />
      </div>

      <div className="rounded-2xl border border-border/70 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
        {isEmpty ? (
          <EmptyState
            icon={Droplet}
            title="No wash jobs yet"
            description="Record your first wash — pick a customer, vehicle and service and get the bay moving."
          >
            <Button onClick={() => setModalOpen(true)}>
              <Droplets /> Record a wash
            </Button>
          </EmptyState>
        ) : !loading && data?.total === 0 ? (
          <EmptyState
            icon={Droplet}
            title="No matching jobs"
            description="Try a different search or status filter."
          />
        ) : (
          <>
            <WashJobsTable
              jobs={data?.data ?? []}
              loading={loading}
              onStart={(job) => void handleStart(job)}
              onComplete={(job) => void handleComplete(job)}
              onCancel={setCancelTarget}
              onReceipt={(job) => void showReceipt(job)}
              onView={setDrawerJob}
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

      <WashJobModal open={modalOpen} onOpenChange={setModalOpen} onCreated={refresh} />
      <WashJobDetailsDrawer
        open={Boolean(drawerJob)}
        onOpenChange={(open) => {
          if (!open) setDrawerJob(null);
        }}
        job={drawerJob}
        onStart={(job) => void handleStart(job)}
        onComplete={(job) => void handleComplete(job)}
        onCancel={setCancelTarget}
        onReceipt={(job) => void showReceipt(job)}
      />
      <ReceiptModal open={Boolean(receipt)} onOpenChange={(open) => { if (!open) setReceipt(null); }} receipt={receipt} />
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        title="Cancel this wash job?"
        description={`Job ${cancelTarget?.reference} for ${cancelTarget?.customerName} (${cancelTarget?.plateNumber}) will be cancelled. This can't be undone.`}
        confirmLabel="Cancel job"
        loading={cancelling}
        onConfirm={() => void handleCancel()}
      />
    </div>
  );
}

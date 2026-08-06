import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Download, KeyRound, Search } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { downloadCsv } from "@/utils/export";
import { auditService } from "@/services/audit.service";
import type { AuditLog } from "@/types";
import { cn } from "@/utils/cn";
import { formatDateTime } from "@/utils/format";

const ACTION_STYLE: Record<string, string> = {
  LOGIN: "bg-emerald-50 text-emerald-700 border-emerald-200",
  LOGOUT: "bg-zinc-100 text-zinc-600 border-zinc-200",
  PASSWORD_CHANGED: "bg-purple-50 text-purple-700 border-purple-200",
  EXPENSE_APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  EXPENSE_REJECTED: "bg-red-50 text-red-700 border-red-200",
  INVENTORY_ADJUSTED: "bg-amber-50 text-amber-700 border-amber-200",
  SETTINGS_UPDATED: "bg-sky-50 text-sky-700 border-sky-200",
};

const actionLabel = (action: string) => action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default function AuditLogsPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("ALL");
  const [entity, setEntity] = useState("ALL");
  const [page, setPage] = useState(1);
  const [actions, setActions] = useState<string[]>([]);
  const [entities, setEntities] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");

  const pageSize = 12;

  useEffect(() => {
    void auditService.actionTypes().then(setActions).catch(() => undefined);
    void auditService.entities().then(setEntities).catch(() => undefined);
  }, []);

  const load = useCallback(
    async (q: string, act: string, ent: string, pageNo: number) => {
      setLoading(true);
      setError(false);
      try {
        const res = await auditService.list({
          page: pageNo,
          pageSize,
          search: q || undefined,
          action: act !== "ALL" ? act : undefined,
          entity: ent !== "ALL" ? ent : undefined,
        });
        setItems(res.data);
        setTotal(res.total);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(search, action, entity, page);
  }, [load, search, action, entity, page]);

  const submitSearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

  const exportCsv = () => {
    if (items.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    const headers = ["time", "action", "entity", "user", "details"];
    const rows = items.map((l) => [formatDateTime(l.createdAt), l.action, l.entity, l.userName, JSON.stringify(l.details ?? l.newValue ?? "")]);
    downloadCsv("audit-log.csv", headers, rows);
    toast.success("Audit log exported");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description="A complete trail of actions across the system.">
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download /> Export
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitSearch()}
            placeholder="Search action, entity or user…"
            className="h-9.5 w-full rounded-xl border border-border/70 bg-background pl-9 pr-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All actions</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>
                {actionLabel(a)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={entity} onValueChange={(v) => { setEntity(v); setPage(1); }}>
          <SelectTrigger className="w-full md:w-44">
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All entities</SelectItem>
            {entities.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingState label="Loading audit trail…" />
      ) : error ? (
        <ErrorState message="Could not load audit logs." onRetry={() => void load(search, action, entity, page)} />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 py-20 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <KeyRound className="size-6" />
          </div>
          <h3 className="mt-4 font-display text-base font-semibold text-foreground">No audit entries</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Actions are recorded here as they happen.</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((log) => (
                  <>
                    <TableRow key={log.id} className="cursor-pointer" onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                      <TableCell>
                        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", expanded === log.id && "rotate-180")} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{formatDateTime(log.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("font-mono text-[10px]", ACTION_STYLE[log.action])}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{log.entity}</TableCell>
                      <TableCell className="text-sm">{log.userName}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{log.ipAddress ?? "—"}</TableCell>
                    </TableRow>
                    {expanded === log.id ? (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={6} className="p-0">
                          <div className="grid gap-3 px-10 py-4 text-sm sm:grid-cols-2">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Details</p>
                              <pre className="mt-1 max-h-40 overflow-auto rounded-xl bg-background p-3 text-xs text-foreground/80">
                                {JSON.stringify(log.details ?? log.newValue ?? log.oldValue ?? {}, null, 2)}
                              </pre>
                            </div>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <p>
                                <span className="font-semibold text-foreground">Entity ID:</span> {log.entityId ?? "—"}
                              </p>
                              <p>
                                <span className="font-semibold text-foreground">Username:</span> {log.username ?? "—"}
                              </p>
                              <p>
                                <span className="font-semibold text-foreground">Recorded:</span> {formatDateTime(log.createdAt)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between border-t border-border/60 px-5 py-3 text-xs text-muted-foreground">
            <span>
              {total} entr{total === 1 ? "y" : "ies"}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

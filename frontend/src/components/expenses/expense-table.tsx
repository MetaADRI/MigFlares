import { Check, MoreHorizontal, Pencil, ReceiptText, Trash2, X } from "lucide-react";
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
import { TableSkeleton } from "@/components/common/loading-state";
import { EXPENSE_CATEGORY_LABEL, EXPENSE_STATUS_META, PAYMENT_METHOD_LABEL } from "@/constants";
import type { Expense } from "@/types";
import { formatCurrency, formatDate } from "@/utils/format";

interface ExpenseTableProps {
  expenses: Expense[];
  loading: boolean;
  sortBy: string;
  sortDir: "asc" | "desc";
  onSort: (key: string) => void;
  onEdit: (expense: Expense) => void;
  onApprove: (expense: Expense) => void;
  onReject: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
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

/** Expenses ledger table. */
export function ExpenseTable({
  expenses,
  loading,
  sortBy,
  sortDir,
  onSort,
  onEdit,
  onApprove,
  onReject,
  onDelete,
}: ExpenseTableProps) {
  if (loading) return <TableSkeleton rows={7} />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead label="Date" active={sortBy === "expenseDate"} dir={sortDir} onClick={() => onSort("expenseDate")} />
          <TableHead>Description</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Vendor</TableHead>
          <TableHead>Method</TableHead>
          <SortableHead label="Amount" active={sortBy === "amount"} dir={sortDir} onClick={() => onSort("amount")} />
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenses.map((expense) => {
          const statusMeta = EXPENSE_STATUS_META[expense.status];
          return (
            <TableRow key={expense.id} className="group">
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDate(expense.expenseDate)}
              </TableCell>
              <TableCell className="max-w-56">
                <p className="truncate font-medium text-foreground">
                  {expense.description ?? "No description"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {expense.createdByName ?? "—"}
                  {expense.employeeName ? ` · ${expense.employeeName}` : ""}
                </p>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{EXPENSE_CATEGORY_LABEL[expense.category]}</Badge>
              </TableCell>
              <TableCell className="max-w-36 truncate text-muted-foreground">
                {expense.vendor ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {PAYMENT_METHOD_LABEL[expense.paymentMethod]}
              </TableCell>
              <TableCell className="font-semibold text-foreground">
                {formatCurrency(expense.amount)}
              </TableCell>
              <TableCell>
                <Badge className={statusMeta.className} dotClassName={statusMeta.dot}>
                  {statusMeta.label}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {expense.status === "PENDING" ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-emerald-600 hover:bg-emerald-50"
                        title="Approve"
                        onClick={() => onApprove(expense)}
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-red-600 hover:bg-red-50"
                        title="Reject"
                        onClick={() => onReject(expense)}
                      >
                        <X className="size-4" />
                      </Button>
                    </>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>
                          {formatCurrency(expense.amount)} · {EXPENSE_CATEGORY_LABEL[expense.category]}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEdit(expense)}>
                          <Pencil /> Edit
                        </DropdownMenuItem>
                        {expense.receiptUrl ? (
                          <DropdownMenuItem asChild>
                            <a href={expense.receiptUrl} target="_blank" rel="noreferrer">
                              <ReceiptText /> View receipt
                            </a>
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(expense)}>
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

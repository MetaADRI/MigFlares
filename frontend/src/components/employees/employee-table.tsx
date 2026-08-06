import { Banknote, MoreHorizontal, Pencil, Power, Trash2, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
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
import type { Employee } from "@/types";
import { formatCurrency, formatDate } from "@/utils/format";

interface EmployeeTableProps {
  employees: Employee[];
  loading: boolean;
  sortBy: string;
  sortDir: "asc" | "desc";
  onSort: (key: string) => void;
  onView: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onSuspend: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
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

/** Staff roster table. */
export function EmployeeTable({
  employees,
  loading,
  sortBy,
  sortDir,
  onSort,
  onView,
  onEdit,
  onSuspend,
  onDelete,
}: EmployeeTableProps) {
  if (loading) return <TableSkeleton rows={7} />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <SortableHead label="Position" active={sortBy === "position"} dir={sortDir} onClick={() => onSort("position")} />
          <TableHead>Phone</TableHead>
          <SortableHead label="Salary" active={sortBy === "salary"} dir={sortDir} onClick={() => onSort("salary")} />
          <SortableHead label="Hired" active={sortBy === "hireDate"} dir={sortDir} onClick={() => onSort("hireDate")} />
          <TableHead>Today</TableHead>
          <TableHead>Total washes</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((employee) => (
          <TableRow key={employee.id} className="group cursor-pointer" onClick={() => onView(employee)}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar name={employee.name} src={employee.avatarUrl} className="size-9" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{employee.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {employee.nrcNumber ?? "No NRC on file"}
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{employee.position}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{employee.phone}</TableCell>
            <TableCell className="text-muted-foreground">
              {employee.salary != null ? (
                <span className="inline-flex items-center gap-1">
                  <Banknote className="size-3.5" />
                  {formatCurrency(employee.salary)}
                </span>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">{formatDate(employee.hireDate)}</TableCell>
            <TableCell>
              <span className="font-semibold text-foreground">{employee.washesToday}</span>
            </TableCell>
            <TableCell className="text-muted-foreground">{employee.totalWashes}</TableCell>
            <TableCell>
              <Badge
                variant={employee.isActive ? "success" : "secondary"}
                dotClassName={employee.isActive ? "bg-emerald-500" : "bg-zinc-400"}
              >
                {employee.isActive ? "Active" : "Suspended"}
              </Badge>
            </TableCell>
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{employee.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onView(employee)}>
                    <UserRound /> View profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(employee)}>
                    <Pencil /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSuspend(employee)}>
                    <Power /> {employee.isActive ? "Suspend" : "Reactivate"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(employee)}>
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

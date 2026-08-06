import {
  AirVent,
  BarChart3,
  Bell,
  Brush,
  CalendarDays,
  Car,
  ClipboardList,
  Droplets,
  Gauge,
  Hand,
  LayoutDashboard,
  LifeBuoy,
  type LucideIcon,
  Package,
  PaintBucket,
  PieChart,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sparkles,
  SprayCan,
  Sun,
  UserPlus,
  UserRound,
  Users,
  Wallet,
  Waves,
  Wind,
  Zap,
} from "lucide-react";
import type {
  BookingStatus,
  CustomerStatus,
  ExpenseCategory,
  ExpenseStatus,
  InventoryCategory,
  MovementType,
  NotificationType,
  PaymentMethod,
  PaymentStatus,
  ReportPeriod,
  ReportType,
  RoleName,
  ServiceCategory,
  VehicleStatus,
  VehicleType,
  WashStatus,
} from "@/types";

export const BRAND = {
  name: "Mig Flares",
  fullName: "Mig Flares Car Wash",
  shortName: "MF",
  tagline: "Premium Car Care",
  location: "Nkoloma Stadium, Lusaka, Zambia",
} as const;

export const CURRENCY = { symbol: "K", code: "ZMW" } as const;

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", path: "/", icon: LayoutDashboard }],
  },
  {
    label: "Operations",
    items: [
      { label: "Wash Jobs", path: "/wash-jobs", icon: Droplets },
      { label: "Bookings", path: "/bookings", icon: CalendarDays },
      { label: "Customers", path: "/customers", icon: Users },
      { label: "Vehicles", path: "/vehicles", icon: Car },
      { label: "Services", path: "/services", icon: Sparkles },
      { label: "Employees", path: "/employees", icon: UserRound },
    ],
  },
  {
    label: "Business",
    items: [
      { label: "Inventory", path: "/inventory", icon: Package },
      { label: "Expenses", path: "/expenses", icon: Wallet },
      { label: "Reports", path: "/reports", icon: BarChart3 },
      { label: "Analytics", path: "/analytics", icon: PieChart },
      { label: "Receipts", path: "/receipts", icon: ReceiptText },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Notifications", path: "/notifications", icon: Bell },
      { label: "Users & Roles", path: "/roles", icon: ShieldCheck },
      { label: "Settings", path: "/settings", icon: Settings },
      { label: "Audit Logs", path: "/audit-logs", icon: ClipboardList },
      { label: "Profile", path: "/profile", icon: UserRound },
      { label: "Help", path: "/help", icon: LifeBuoy },
    ],
  },
];

export function findNavItem(pathname: string): NavItem | undefined {
  for (const group of NAV_GROUPS) {
    const match = group.items.find((item) => item.path === pathname);
    if (match) return match;
  }
  return undefined;
}

/** Permission required to access each route (used by guards & sidebar). */
export const PATH_PERMISSIONS: Record<string, string> = {
  "/": "dashboard:view",
  "/wash-jobs": "wash-jobs:view",
  "/bookings": "bookings:view",
  "/customers": "customers:view",
  "/vehicles": "vehicles:view",
  "/services": "services:view",
  "/employees": "employees:view",
  "/inventory": "inventory:view",
  "/expenses": "expenses:view",
  "/reports": "reports:view",
  "/analytics": "analytics:view",
  "/receipts": "receipts:view",
  "/notifications": "notifications:view",
  "/settings": "settings:view",
  "/audit-logs": "audit-logs:view",
  "/profile": "dashboard:view",
  "/help": "support:view",
  "/roles": "users:view",
};

export const WASH_STATUS_META: Record<
  WashStatus,
  { label: string; className: string; dot: string }
> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-sky-50 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-zinc-100 text-zinc-600 border-zinc-200",
    dot: "bg-zinc-400",
  },
};

export const BOOKING_STATUS_META: Record<
  BookingStatus,
  { label: string; className: string; dot: string }
> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-sky-50 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-zinc-100 text-zinc-600 border-zinc-200",
    dot: "bg-zinc-400",
  },
  NO_SHOW: {
    label: "No Show",
    className: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
};

export const CUSTOMER_STATUS_META: Record<
  CustomerStatus,
  { label: string; className: string; dot: string }
> = {
  ACTIVE: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  VIP: {
    label: "VIP",
    className: "bg-purple-50 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
  },
  INACTIVE: {
    label: "Inactive",
    className: "bg-zinc-100 text-zinc-600 border-zinc-200",
    dot: "bg-zinc-400",
  },
  BLACKLISTED: {
    label: "Blacklisted",
    className: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
};

export const VEHICLE_STATUS_META: Record<
  VehicleStatus,
  { label: string; className: string; dot: string }
> = {
  ACTIVE: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  IN_SERVICE: {
    label: "In Service",
    className: "bg-sky-50 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
  },
  RETIRED: {
    label: "Retired",
    className: "bg-zinc-100 text-zinc-600 border-zinc-200",
    dot: "bg-zinc-400",
  },
};

export const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
}[] = [
  { value: "CASH", label: "Cash" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Cash",
  MOBILE_MONEY: "Mobile Money",
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
};

export const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: "SEDAN", label: "Sedan" },
  { value: "SUV", label: "SUV" },
  { value: "HATCHBACK", label: "Hatchback" },
  { value: "TRUCK", label: "Truck" },
  { value: "VAN", label: "Van" },
  { value: "MOTORCYCLE", label: "Motorcycle" },
  { value: "BUS", label: "Bus" },
  { value: "OTHER", label: "Other" },
];

export const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = Object.fromEntries(
  VEHICLE_TYPES.map((t) => [t.value, t.label]),
) as Record<VehicleType, string>;

export const SERVICE_CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: "EXTERIOR", label: "Exterior" },
  { value: "INTERIOR", label: "Interior" },
  { value: "FULL", label: "Full Wash" },
  { value: "DETAILING", label: "Detailing" },
  { value: "OTHER", label: "Other" },
];

/** Add-on services offered at the bay, shown as toggle chips on the wash form. */
export const WASH_EXTRAS: {
  id: string;
  name: string;
  price: number;
}[] = [
  { id: "ext-air", name: "Air Freshener", price: 40 },
  { id: "ext-sanitize", name: "Interior Sanitize", price: 60 },
  { id: "ext-tyre", name: "Tyre Shine", price: 50 },
  { id: "ext-polish", name: "Headlight Polish", price: 70 },
  { id: "ext-wax", name: "Quick Wax", price: 100 },
  { id: "ext-vacuum", name: "Extra Vacuum", price: 50 },
];

/* ---------------------------- Services ----------------------------- */

/** Icon choices for service cards (lucide icon key → component). */
export const SERVICE_ICONS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "Droplets", label: "Droplets", icon: Droplets },
  { value: "Sparkles", label: "Sparkles", icon: Sparkles },
  { value: "Car", label: "Car", icon: Car },
  { value: "ShieldCheck", label: "Shield", icon: ShieldCheck },
  { value: "Brush", label: "Brush", icon: Brush },
  { value: "Wind", label: "Wind", icon: Wind },
  { value: "Waves", label: "Waves", icon: Waves },
  { value: "Zap", label: "Zap", icon: Zap },
  { value: "PaintBucket", label: "Paint", icon: PaintBucket },
  { value: "SprayCan", label: "Spray", icon: SprayCan },
  { value: "Gauge", label: "Gauge", icon: Gauge },
  { value: "Sun", label: "Sun", icon: Sun },
  { value: "AirVent", label: "Air Vent", icon: AirVent },
  { value: "Hand", label: "Hand Wash", icon: Hand },
];

export function serviceIcon(value: string | null): LucideIcon {
  return SERVICE_ICONS.find((s) => s.value === value)?.icon ?? Sparkles;
}

/** Brand-compatible colour swatches for service cards. */
export const SERVICE_COLOURS = [
  "#F47B20",
  "#191919",
  "#0EA5E9",
  "#10B981",
  "#8B5CF6",
  "#EF4444",
  "#F59E0B",
  "#14B8A6",
  "#6366F1",
  "#EC4899",
] as const;

/* --------------------------- Inventory ----------------------------- */

export const INVENTORY_CATEGORIES: { value: InventoryCategory; label: string }[] = [
  { value: "CLEANING_CHEMICALS", label: "Cleaning Chemicals" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "CONSUMABLES", label: "Consumables" },
  { value: "SUPPLIES", label: "Supplies" },
  { value: "OTHER", label: "Other" },
];

export const INVENTORY_CATEGORY_LABEL: Record<InventoryCategory, string> = Object.fromEntries(
  INVENTORY_CATEGORIES.map((c) => [c.value, c.label]),
) as Record<InventoryCategory, string>;

export const MOVEMENT_TYPE_META: Record<
  MovementType,
  { label: string; className: string; sign: string }
> = {
  RESTOCK: {
    label: "Restock",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    sign: "+",
  },
  ADJUSTMENT: {
    label: "Adjustment",
    className: "bg-sky-50 text-sky-700 border-sky-200",
    sign: "→",
  },
  ISSUE: {
    label: "Issued",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    sign: "−",
  },
  WRITE_OFF: {
    label: "Write-off",
    className: "bg-red-50 text-red-700 border-red-200",
    sign: "−",
  },
};

export const PAYMENT_STATUS_META: Record<
  PaymentStatus,
  { label: string; className: string; dot: string }
> = {
  PAID: {
    label: "Paid",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  PARTIAL: {
    label: "Partial",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  REFUNDED: {
    label: "Refunded",
    className: "bg-purple-50 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
  },
  VOIDED: {
    label: "Voided",
    className: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
};

/* ---------------------------- Expenses ----------------------------- */

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "RENT", label: "Rent" },
  { value: "ELECTRICITY", label: "Electricity" },
  { value: "WATER", label: "Water" },
  { value: "INTERNET", label: "Internet" },
  { value: "FUEL", label: "Fuel" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "CLEANING_CHEMICALS", label: "Cleaning Chemicals" },
  { value: "REPAIRS", label: "Repairs" },
  { value: "STAFF_SALARIES", label: "Staff Salaries" },
  { value: "MARKETING", label: "Marketing" },
  { value: "MISC", label: "Miscellaneous" },
];

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.value, c.label]),
) as Record<ExpenseCategory, string>;

export const EXPENSE_STATUS_META: Record<
  ExpenseStatus,
  { label: string; className: string; dot: string }
> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
};

/* ---------------------------- Employees ---------------------------- */

export const EMPLOYEE_POSITIONS = [
  "Lead Attendant",
  "Attendant",
  "Detailer",
  "Cashier",
  "Supervisor",
  "Manager",
] as const;

/* ------------------------- Permissions & RBAC ---------------------- */

/** Canonical permission catalog — mirrors the backend seed. */
export const PERMISSION_CATALOG: {
  module: string;
  moduleLabel: string;
  permissions: { key: string; name: string; description: string }[];
}[] = [
  {
    module: "DASHBOARD",
    moduleLabel: "Dashboard",
    permissions: [{ key: "dashboard:view", name: "View dashboard", description: "See KPIs and the overview" }],
  },
  {
    module: "CUSTOMERS",
    moduleLabel: "Customers",
    permissions: [
      { key: "customers:view", name: "View customers", description: "Browse the customer list and profiles" },
      { key: "customers:manage", name: "Manage customers", description: "Create, edit and delete customers" },
    ],
  },
  {
    module: "VEHICLES",
    moduleLabel: "Vehicles",
    permissions: [
      { key: "vehicles:view", name: "View vehicles", description: "Browse registered vehicles" },
      { key: "vehicles:manage", name: "Manage vehicles", description: "Register, edit and delete vehicles" },
    ],
  },
  {
    module: "WASH_JOBS",
    moduleLabel: "Wash Jobs",
    permissions: [
      { key: "wash-jobs:view", name: "View wash jobs", description: "See the job board and history" },
      { key: "wash-jobs:manage", name: "Manage wash jobs", description: "Record, start, complete and cancel washes" },
    ],
  },
  {
    module: "BOOKINGS",
    moduleLabel: "Bookings",
    permissions: [
      { key: "bookings:view", name: "View bookings", description: "See the appointment calendar and bookings" },
      { key: "bookings:manage", name: "Manage bookings", description: "Create, reschedule and update bookings" },
    ],
  },
  {
    module: "SERVICES",
    moduleLabel: "Services",
    permissions: [
      { key: "services:view", name: "View services", description: "Browse the service catalogue" },
      { key: "services:manage", name: "Manage services", description: "Create, edit and deactivate services" },
    ],
  },
  {
    module: "EMPLOYEES",
    moduleLabel: "Employees",
    permissions: [
      { key: "employees:view", name: "View employees", description: "Browse the staff roster" },
      { key: "employees:manage", name: "Manage employees", description: "Add, edit and suspend staff" },
    ],
  },
  {
    module: "INVENTORY",
    moduleLabel: "Inventory",
    permissions: [
      { key: "inventory:view", name: "View inventory", description: "Browse stock levels" },
      { key: "inventory:manage", name: "Manage inventory", description: "Add items and adjust stock" },
    ],
  },
  {
    module: "EXPENSES",
    moduleLabel: "Expenses",
    permissions: [
      { key: "expenses:view", name: "View expenses", description: "Browse the expense ledger" },
      { key: "expenses:manage", name: "Manage expenses", description: "Create, edit and delete expenses" },
      { key: "expenses:approve", name: "Approve expenses", description: "Approve or reject pending expenses" },
    ],
  },
  {
    module: "RECEIPTS",
    moduleLabel: "Receipts",
    permissions: [
      { key: "receipts:view", name: "View receipts", description: "Browse issued receipts" },
      { key: "receipts:manage", name: "Manage receipts", description: "Void and duplicate receipts" },
    ],
  },
  {
    module: "REPORTS",
    moduleLabel: "Reports",
    permissions: [{ key: "reports:view", name: "View reports", description: "Generate and export reports" }],
  },
  {
    module: "ANALYTICS",
    moduleLabel: "Analytics",
    permissions: [{ key: "analytics:view", name: "View analytics", description: "Executive analytics dashboard" }],
  },
  {
    module: "NOTIFICATIONS",
    moduleLabel: "Notifications",
    permissions: [{ key: "notifications:view", name: "View notifications", description: "See the notification centre" }],
  },
  {
    module: "SETTINGS",
    moduleLabel: "Settings",
    permissions: [
      { key: "settings:view", name: "View settings", description: "Read business configuration" },
      { key: "settings:manage", name: "Manage settings", description: "Change business configuration" },
    ],
  },
  {
    module: "AUDIT_LOGS",
    moduleLabel: "Audit Logs",
    permissions: [{ key: "audit-logs:view", name: "View audit logs", description: "Review the action trail" }],
  },
  {
    module: "USERS",
    moduleLabel: "Users & Roles",
    permissions: [
      { key: "users:view", name: "View users & roles", description: "See roles, permissions and users" },
      { key: "users:manage", name: "Manage users & roles", description: "Create roles and assign permissions" },
    ],
  },
  {
    module: "SUPPORT",
    moduleLabel: "Help & Support",
    permissions: [{ key: "support:view", name: "Help & support", description: "Access the help centre" }],
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_CATALOG.flatMap((m) => m.permissions.map((p) => p.key));

export const ROLE_META: Record<
  RoleName,
  { label: string; description: string; className: string; dot: string }
> = {
  OWNER: {
    label: "Super Admin",
    description: "Full access to the entire system",
    className: "bg-orange-50 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
  },
  MANAGER: {
    label: "Manager",
    description: "Runs day-to-day operations",
    className: "bg-sky-50 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
  },
  CASHIER: {
    label: "Cashier",
    description: "Handles payments and receipts",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  ATTENDANT: {
    label: "Attendant",
    description: "Records washes at the bay",
    className: "bg-purple-50 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
  },
};

/** Default permission keys per role — mirrors the backend seed. */
export const ROLE_DEFAULT_PERMISSIONS: Record<RoleName, string[]> = {
  OWNER: ALL_PERMISSION_KEYS,
  MANAGER: [
    "dashboard:view",
    "customers:view", "customers:manage",
    "vehicles:view", "vehicles:manage",
    "wash-jobs:view", "wash-jobs:manage",
    "bookings:view", "bookings:manage",
    "services:view", "services:manage",
    "employees:view", "employees:manage",
    "inventory:view", "inventory:manage",
    "expenses:view", "expenses:manage", "expenses:approve",
    "receipts:view", "receipts:manage",
    "reports:view", "analytics:view", "notifications:view",
    "settings:view", "audit-logs:view", "users:view", "support:view",
  ],
  CASHIER: [
    "dashboard:view",
    "customers:view", "customers:manage",
    "vehicles:view",
    "wash-jobs:view", "wash-jobs:manage",
    "bookings:view", "bookings:manage",
    "services:view",
    "receipts:view", "receipts:manage",
    "notifications:view", "support:view",
  ],
  ATTENDANT: [
    "dashboard:view",
    "customers:view",
    "vehicles:view",
    "wash-jobs:view", "wash-jobs:manage",
    "bookings:view", "bookings:manage",
    "services:view",
    "notifications:view", "support:view",
  ],
};

/* -------------------------- Notifications -------------------------- */

export const NOTIFICATION_CATEGORIES = [
  { value: "SYSTEM", label: "System" },
  { value: "INVENTORY", label: "Inventory" },
  { value: "WASH", label: "Wash jobs" },
  { value: "BOOKING", label: "Bookings" },
  { value: "EXPENSE", label: "Expenses" },
  { value: "EMPLOYEE", label: "Employees" },
  { value: "REMINDER", label: "Reminders" },
] as const;

export const NOTIFICATION_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  NOTIFICATION_CATEGORIES.map((c) => [c.value, c.label]),
);

export const NOTIFICATION_CATEGORY_META: Record<
  string,
  { className: string; dot: string }
> = {
  SYSTEM: { className: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" },
  INVENTORY: { className: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  WASH: { className: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  BOOKING: { className: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" },
  EXPENSE: { className: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  EMPLOYEE: { className: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  REMINDER: { className: "bg-zinc-100 text-zinc-600 border-zinc-200", dot: "bg-zinc-400" },
};

export const NOTIFICATION_TYPE_META: Record<NotificationType, { icon: string }> = {
  INFO: { icon: "info" },
  SUCCESS: { icon: "success" },
  WARNING: { icon: "warning" },
  ERROR: { icon: "error" },
};

/* ----------------------------- Reports ----------------------------- */

export const REPORT_TYPES: {
  value: ReportType;
  label: string;
  description: string;
  chart: "bar" | "line" | "pie" | "area";
}[] = [
  { value: "REVENUE", label: "Revenue", description: "Income, washes and ticket size", chart: "area" },
  { value: "CUSTOMERS", label: "Customers", description: "Growth, activity and top spenders", chart: "bar" },
  { value: "VEHICLES", label: "Vehicles", description: "Wash frequency per vehicle", chart: "bar" },
  { value: "EMPLOYEES", label: "Employees", description: "Productivity and revenue by staff", chart: "bar" },
  { value: "INVENTORY", label: "Inventory", description: "Consumption and stock movements", chart: "bar" },
  { value: "EXPENSES", label: "Expenses", description: "Spending by category", chart: "pie" },
  { value: "SERVICES", label: "Services", description: "Popularity and revenue per service", chart: "pie" },
  { value: "WASH_JOBS", label: "Wash Jobs", description: "Volume, statuses and completion", chart: "line" },
  { value: "RECEIPTS", label: "Receipts", description: "Issued receipts and values", chart: "line" },
];

export const REPORT_PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom range" },
];

/* ---------------------------- Audit logs --------------------------- */

export const AUDIT_ENTITIES = [
  "Auth",
  "Customer",
  "Vehicle",
  "WashRecord",
  "Booking",
  "Service",
  "Employee",
  "InventoryItem",
  "Expense",
  "Receipt",
  "Settings",
  "Role",
  "User",
] as const;

export const QUICK_ACTIONS: {
  label: string;
  description: string;
  path: string;
  icon: LucideIcon;
}[] = [
  {
    label: "New Wash Job",
    description: "Record a wash",
    path: "/wash-jobs?new=1",
    icon: Droplets,
  },
  {
    label: "Add Customer",
    description: "Create a profile",
    path: "/customers?new=1",
    icon: UserPlus,
  },
  {
    label: "Add Vehicle",
    description: "Register a car",
    path: "/vehicles?new=1",
    icon: Car,
  },
  {
    label: "View Reports",
    description: "Business insights",
    path: "/reports",
    icon: BarChart3,
  },
];

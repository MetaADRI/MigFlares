/** Domain types shared across the entire frontend. */

export type RoleName = "OWNER" | "MANAGER" | "CASHIER" | "ATTENDANT";

export type WashStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export type PaymentMethod = "CASH" | "MOBILE_MONEY" | "CARD" | "BANK_TRANSFER";

export type VehicleType =
  | "SEDAN"
  | "SUV"
  | "HATCHBACK"
  | "TRUCK"
  | "VAN"
  | "MOTORCYCLE"
  | "BUS"
  | "OTHER";

export type VehicleStatus = "ACTIVE" | "IN_SERVICE" | "RETIRED";

export type ServiceCategory = "EXTERIOR" | "INTERIOR" | "FULL" | "DETAILING" | "OTHER";

export type CustomerStatus = "ACTIVE" | "INACTIVE" | "VIP" | "BLACKLISTED";

export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export type PaymentStatus = "PAID" | "PARTIAL" | "REFUNDED" | "VOIDED";

export type MovementType = "RESTOCK" | "ADJUSTMENT" | "ISSUE" | "WRITE_OFF";

export type InventoryCategory =
  | "CLEANING_CHEMICALS"
  | "EQUIPMENT"
  | "CONSUMABLES"
  | "SUPPLIES"
  | "OTHER";

export type ExpenseCategory =
  | "RENT"
  | "ELECTRICITY"
  | "WATER"
  | "INTERNET"
  | "FUEL"
  | "EQUIPMENT"
  | "CLEANING_CHEMICALS"
  | "REPAIRS"
  | "STAFF_SALARIES"
  | "MARKETING"
  | "MISC";

export type ExpenseStatus = "PENDING" | "APPROVED" | "REJECTED";

export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "CASUAL";

export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "ON_LEAVE" | "HOLIDAY";

export type AttendanceSource = "LOGIN" | "CLOCK_BUTTON" | "MANUAL";

export type LeaveType = "ANNUAL" | "SICK" | "UNPAID" | "OTHER";

export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type PayrollRunStatus = "DRAFT" | "PROCESSED" | "PAID";

export type PayslipStatus = "DRAFT" | "PAID";

export interface User {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: RoleName;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  avatarUrl: string | null;
  status: CustomerStatus;
  vehiclesCount: number;
  totalSpent: number;
  visits: number;
  lastVisitAt: string | null;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number | null;
  color: string;
  vehicleType: VehicleType;
  imageUrl: string | null;
  customerId: string;
  ownerName: string;
  status: VehicleStatus;
  washCount: number;
  lastWashAt: string | null;
  createdAt: string;
}

export interface ServiceInventoryRequirement {
  inventoryItemId: string;
  name: string;
  unit: string;
  quantity: number;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMin: number | null;
  category: ServiceCategory;
  icon: string | null;
  colour: string;
  displayOrder: number;
  isActive: boolean;
  inventoryRequired: ServiceInventoryRequirement[];
}

export interface WashExtra {
  id: string;
  name: string;
  price: number;
}

export interface WashJob {
  id: string;
  reference: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  vehicleId: string;
  plateNumber: string;
  vehicleSummary: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  extras: WashExtra[];
  discount: number;
  subtotal: number;
  total: number;
  paymentMethod: PaymentMethod;
  employeeId: string | null;
  employeeName: string | null;
  notes: string | null;
  status: WashStatus;
  beforePhotos: string[];
  afterPhotos: string[];
  receiptNo: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
}

export interface Booking {
  id: string;
  reference: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  vehicleId: string;
  plateNumber: string;
  vehicleSummary: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  employeeId: string | null;
  employeeName: string | null;
  scheduledAt: string;
  durationMin: number;
  status: BookingStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Receipt {
  id: string;
  receiptNo: string;
  washJobId: string;
  washJobReference: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  vehicleId: string;
  plateNumber: string;
  vehicleSummary: string;
  employeeId: string | null;
  employeeName: string | null;
  items: { name: string; price: number }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  changeDue: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  issuedByName: string;
  voidReason: string | null;
  voidedAt: string | null;
  issuedAt: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface Employee {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  avatarUrl: string | null;
  nrcNumber: string | null;
  position: string;
  hireDate: string;
  salary: number | null;
  emergencyContact: EmergencyContact | null;
  notes: string | null;
  isActive: boolean;
  payday: number | null;
  employmentType: EmploymentType;
  payrollEnabled: boolean;
  attendanceRequired: boolean;
  overtimeEligible: boolean;
  washesToday: number;
  totalWashes: number;
  expensesCount: number;
}

export interface EmployeeRef {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
}

export interface EmployeeStats {
  carsWashedToday: number;
  carsWashedWeek: number;
  carsWashedMonth: number;
  revenueGenerated: number;
  avgRating: number;
  attendance: {
    completed: number;
    cancelled: number;
    total: number;
    completionRate: number;
  };
}

export interface SalaryMonth {
  month: string;
  label: string;
  salaryAmount: number | null;
  paid: boolean;
  amount: number | null;
  paymentDate: string | null;
  method: string | null;
}

export interface TimeEntry {
  id: string;
  clockInAt: string;
  clockOutAt: string | null;
  hoursWorked: number | null;
  notes: string | null;
}

export interface TimeEntriesResult {
  current: TimeEntry | null;
  entries: TimeEntry[];
}

/* ------------------------ Attendance / Leave / Payroll ------------------------ */

export interface AttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatus;
  clockInAt: string | null;
  clockOutAt: string | null;
  hoursWorked: number | null;
  overtimeHours: number | null;
  overtimeMinutes: number | null;
  source: AttendanceSource;
  timeEntryId: string | null;
  notes: string | null;
  employee?: EmployeeRef;
}

export interface AttendanceTodaySummary {
  date: string;
  present: number;
  late: number;
  absent: number;
  onLeave: number;
  holiday: number;
  total: number;
  clockedInNow: number;
}

export interface LeaveRequest {
  id: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  status: LeaveStatus;
  reason: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  employee?: EmployeeRef;
}

export interface LeaveBalances {
  annual: { entitlement: number; used: number; remaining: number };
  sickUsed: number;
  unpaidUsed: number;
  otherUsed: number;
  pendingDays: number;
}

export interface PayrollDeductions {
  loan: number;
  damages: number;
  uniform: number;
  transport: number;
  meals: number;
  advances: number;
  other: number;
}

export interface PayrollRule {
  name: string;
  startTime: string;
  graceMinutes: number;
  standardMinutesPerDay: number;
  overtimeRate: number;
  dailyOvertimeThresholdMin: number;
  defaultPayday: number;
  bonusEnabled: boolean;
  overtimeEnabled: boolean;
  allowancesEnabled: boolean;
  deductions: PayrollDeductions;
  notes: string | null;
}

export interface Payslip {
  id: string;
  runId: string;
  employee?: EmployeeRef;
  periodMonth: string;
  runStatus: PayrollRunStatus;
  baseSalary: number;
  overtimeHours: number;
  overtimeAmount: number;
  bonusAmount: number;
  allowancesAmount: number;
  grossAmount: number;
  deductions: PayrollDeductions;
  totalDeductions: number;
  netAmount: number;
  workedDays: number;
  absentDays: number;
  leaveDays: number;
  status: PayslipStatus;
  paidAt: string | null;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
}

export interface PayrollRun {
  id: string;
  periodMonth: string;
  status: PayrollRunStatus;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employeeCount: number;
  payslipCount?: number;
  ruleSnapshot: Record<string, unknown> | null;
  processedAt: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  payslips?: Payslip[];
}

export interface PayrollSummary {
  monthlySalary: number;
  payday: number;
  nextPayday: string;
  lastPaid: { periodMonth: string; amount: number; paidAt: string | null } | null;
  ytdPaid: number;
  payslipCount: number;
}

export interface PaydayReminder {
  payday: number;
  dueToday: boolean;
  previousMonthUnpaid: boolean;
  currentMonthProcessed: boolean;
  message: string | null;
}

export interface StaffSnapshot {
  attendance: AttendanceTodaySummary;
  pendingLeave: number;
  payday: PaydayReminder;
  currentRun: {
    id: string;
    periodMonth: string;
    status: PayrollRunStatus;
    payslipCount: number;
    employeeCount: number;
    totalNet: number;
  } | null;
  clockedIn: {
    id: string;
    firstName: string;
    lastName: string;
    position: string;
    clockInAt: string;
  }[];
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: InventoryCategory;
  supplier: string | null;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  quantityAvailable: number;
  minimumQuantity: number;
  maximumQuantity: number;
  reorderLevel: number;
  storageLocation: string | null;
  lastRestocked: string | null;
  isActive: boolean;
  lowStock: boolean;
  outOfStock: boolean;
  movementCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  type: MovementType;
  quantity: number;
  balanceAfter: number;
  reason: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface InventoryStats {
  totalValue: number;
  lowStockCount: number;
  lowStockItems: string[];
  outOfStockCount: number;
  recentlyAddedCount: number;
  monthlyPurchases: number;
}

export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  vendor: string | null;
  description: string | null;
  receiptUrl: string | null;
  paymentMethod: PaymentMethod;
  expenseDate: string;
  status: ExpenseStatus;
  createdByName: string | null;
  employeeName: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface ExpenseStats {
  monthlyExpenses: number;
  todayExpenses: number;
  pendingApprovals: number;
  largestExpense: {
    amount: number;
    category: ExpenseCategory;
    vendor: string | null;
    expenseDate: string;
  } | null;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  category: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResult extends PaginatedBase<Notification> {
  unreadCount: number;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  userName: string;
  username: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface PermissionDef {
  id: string;
  key: string;
  module: string;
  name: string;
  description: string | null;
}

export interface Role {
  id: string;
  name: RoleName;
  description: string | null;
  isActive: boolean;
  userCount: number;
  permissions: string[];
}

export interface SystemUser {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  roleId: string;
  roleName: RoleName;
}

export interface LoginRecord {
  createdAt: string;
  ipAddress: string | null;
}

export interface LoginHistoryResult {
  total: number;
  data: LoginRecord[];
}

export type ReportType =
  | "REVENUE"
  | "CUSTOMERS"
  | "VEHICLES"
  | "EMPLOYEES"
  | "INVENTORY"
  | "EXPENSES"
  | "SERVICES"
  | "WASH_JOBS"
  | "RECEIPTS"
  | "ATTENDANCE"
  | "LEAVE"
  | "PAYROLL"
  | "OVERTIME";

export type ReportPeriod = "today" | "yesterday" | "week" | "month" | "year" | "custom";

export interface ReportSummaryCard {
  label: string;
  value: number;
  kind: "currency" | "number" | "percent";
}

export interface ReportResult {
  type: ReportType;
  periodLabel: string;
  summary: ReportSummaryCard[];
  series: { label: string; value: number; secondary?: number }[];
  table: Record<string, string | number | null>[];
}

export interface AnalyticsOverview {
  kpis: {
    revenueGrowth: number;
    averageDailyRevenue: number;
    avgWashTimeMin: number;
    carsPerDay: number;
    avgTicket: number;
    monthlyGrowth: number;
    monthlyRevenue: number;
    monthlyProfit: number;
    monthlyExpenses: number;
    todayRevenue: number;
    todayWashes: number;
  };
  daily: { label: string; revenue: number; washes: number; expenses: number; profit: number }[];
  popularServices: { name: string; count: number; revenue: number }[];
  peakHours: { hour: string; value: number }[];
  topCustomers: { name: string; visits: number; total: number }[];
  retention: {
    totalCustomers: number;
    returningCustomers: number;
    repeatCustomers: number;
    retentionRate: number;
  };
  employeeProductivity: { label: string; washes: number; revenue: number }[];
  inventoryConsumption: { label: string; value: number }[];
  expenseTrends: { label: string; value: number }[];
  summary: {
    receiptsIssued: number;
    receiptsVoided: number;
    activeEmployees: number;
    activeServices: number;
    totalWashes: number;
    completedWashes: number;
  };
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: "wash" | "customer" | "payment" | "system";
}

export interface TopService {
  id: string;
  name: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface RevenuePoint {
  label: string;
  revenue: number;
  cars: number;
}

export interface DashboardStats {
  todayRevenue: number;
  todayRevenueTrend: number;
  weeklyRevenue: number;
  weeklyRevenueTrend: number;
  monthlyRevenue: number;
  monthlyRevenueTrend: number;
  todayCars: number;
  pendingWashes: number;
  inProgressWashes: number;
  completedWashes: number;
  employeesPresent: number;
  avgTicket: number;
}

export interface InventoryAlert {
  id: string;
  name: string;
  sku: string;
  quantityAvailable: number;
  reorderLevel: number;
  unit: string;
  outOfStock: boolean;
}

export interface DashboardInsights {
  inventoryAlerts: InventoryAlert[];
  expenseSummary: {
    monthlyExpenses: number;
    pendingApprovals: number;
    monthlyTrend: number;
    largestExpense: { amount: number; category: ExpenseCategory; vendor: string | null } | null;
  };
  latestReceipts: {
    id: string;
    receiptNo: string;
    customerName: string;
    plateNumber: string;
    total: number;
    issuedAt: string;
  }[];
  serviceDistribution: { name: string; count: number; revenue: number }[];
  activeEmployees: { id: string; name: string; washes: number; revenue: number }[];
}

export interface PaginatedBase<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type SettingsMap = Record<string, string>;

export interface PermissionCatalogItem {
  key: string;
  module: string;
  name: string;
  description: string;
}

import { z } from "zod";
import {
  EXPENSE_CATEGORIES,
  EMPLOYMENT_TYPES,
  INVENTORY_CATEGORIES,
  LEAVE_TYPES,
  PAYMENT_METHODS,
  SERVICE_CATEGORIES,
  VEHICLE_TYPES,
} from "@/constants";
import type {
  AttendanceStatus,
  BookingStatus,
  EmploymentType,
  ExpenseCategory,
  InventoryCategory,
  LeaveType,
  MovementType,
  PaymentMethod,
  ServiceCategory,
  VehicleType,
  WashStatus,
} from "@/types";

/** Zod schemas used by React Hook Form across the app. */

export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;

const zambianPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(
    z.string().regex(/^(\+260|0)\d{9}$/, "Enter a valid Zambian phone number (e.g. 0977 000 000)"),
  );

const emailOrEmpty = z.union([z.string().email("Enter a valid email address"), z.literal("")]);
const longTextOrEmpty = z.string().trim().max(500, "Too long").or(z.literal(""));

export const customerSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required"),
  lastName: z.string().trim().min(2, "Last name is required"),
  phone: zambianPhone,
  email: emailOrEmpty,
  address: longTextOrEmpty,
  notes: longTextOrEmpty,
});
export type CustomerInput = z.infer<typeof customerSchema>;

export const vehicleSchema = z.object({
  plateNumber: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "Plate number is required")
    .max(12, "Too long"),
  make: z.string().trim().min(2, "Make is required"),
  model: z.string().trim().min(1, "Model is required"),
  year: z.coerce
    .number()
    .int("Enter a year")
    .min(1980, "Year must be 1980 or later")
    .max(new Date().getFullYear() + 1, "Year is invalid"),
  color: z.string().trim().min(2, "Colour is required"),
  vehicleType: z.enum(VEHICLE_TYPES.map((t) => t.value) as [VehicleType, ...VehicleType[]]),
  customerId: z.string().min(1, "Owner is required"),
});
export type VehicleInput = z.infer<typeof vehicleSchema>;

export const washJobSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  vehicleId: z.string().min(1, "Select a vehicle"),
  serviceId: z.string().min(1, "Select a service"),
  extras: z
    .array(z.object({ id: z.string(), name: z.string(), price: z.number() }))
    .default([]),
  discount: z.coerce.number().min(0, "Discount can't be negative").max(50_000),
  paymentMethod: z.enum(
    PAYMENT_METHODS.map((m) => m.value) as [PaymentMethod, ...PaymentMethod[]],
  ),
  employeeId: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(500, "Too long").or(z.literal("")),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as [
    WashStatus,
    ...WashStatus[],
  ]),
  beforePhotos: z.array(z.string()).default([]),
  afterPhotos: z.array(z.string()).default([]),
});
export type WashJobInput = z.infer<typeof washJobSchema>;

export const bookingSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  vehicleId: z.string().min(1, "Select a vehicle"),
  serviceId: z.string().min(1, "Select a service"),
  employeeId: z.string().optional().or(z.literal("")),
  scheduledAt: z.string().min(1, "Date and time are required"),
  durationMin: z.coerce.number().int("Whole minutes only").min(10, "At least 10 minutes").max(480),
  notes: z.string().trim().max(500, "Too long").or(z.literal("")),
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as [
    BookingStatus,
    ...BookingStatus[],
  ]),
});
export type BookingInput = z.infer<typeof bookingSchema>;

export const receiptSchema = z.object({
  amountPaid: z.coerce.number().min(0, "Amount can't be negative"),
});
export type ReceiptInput = z.infer<typeof receiptSchema>;

/* ----------------------------- Services ---------------------------- */

export const serviceRequirementSchema = z.object({
  inventoryItemId: z.string().min(1, "Select an item"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
});

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Service name is required"),
  description: z.string().trim().max(300, "Too long").or(z.literal("")),
  price: z.coerce.number().min(0, "Price can't be negative"),
  durationMin: z.coerce.number().min(0, "Duration can't be negative").max(720),
  category: z.enum(SERVICE_CATEGORIES.map((c) => c.value) as [ServiceCategory, ...ServiceCategory[]]),
  icon: z.string().optional().or(z.literal("")),
  colour: z.string().min(4, "Pick a colour"),
  displayOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
  inventoryRequired: z.array(serviceRequirementSchema).default([]),
});
export type ServiceInput = z.infer<typeof serviceSchema>;

export const stockAdjustSchema = z.object({
  type: z.enum(["RESTOCK", "ADJUSTMENT", "ISSUE", "WRITE_OFF"] as [
    MovementType,
    ...MovementType[],
  ]),
  quantity: z.coerce.number().min(0, "Quantity can't be negative"),
  reason: z.string().trim().max(300, "Too long").or(z.literal("")),
});
export type StockAdjustInput = z.infer<typeof stockAdjustSchema>;

/* ---------------------------- Employees ---------------------------- */

export const employeeSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required"),
  lastName: z.string().trim().min(2, "Last name is required"),
  phone: zambianPhone,
  email: emailOrEmpty,
  nrcNumber: z
    .string()
    .trim()
    .min(3, "NRC number is required")
    .or(z.literal("")),
  position: z.string().trim().min(2, "Position is required"),
  salary: z.coerce.number().min(0, "Salary can't be negative"),
  hireDate: z.string().min(1, "Hire date is required"),
  emergencyName: z.string().trim().max(100).or(z.literal("")),
  emergencyPhone: z.string().trim().max(30).or(z.literal("")),
  emergencyRelation: z.string().trim().max(50).or(z.literal("")),
  notes: longTextOrEmpty,
  payday: z.coerce.number().int("Whole day only").min(1, "Between 1 and 28").max(28, "Between 1 and 28"),
  employmentType: z.enum(
    EMPLOYMENT_TYPES.map((t) => t.value) as [EmploymentType, ...EmploymentType[]],
  ),
  payrollEnabled: z.boolean(),
  attendanceRequired: z.boolean(),
  overtimeEligible: z.boolean(),
});
export type EmployeeInput = z.infer<typeof employeeSchema>;

/* ---------------------- Attendance / Leave / Payroll ---------------------- */

export const attendanceCorrectionSchema = z.object({
  status: z.enum(["PRESENT", "LATE", "ABSENT", "ON_LEAVE", "HOLIDAY"] as [
    AttendanceStatus,
    ...AttendanceStatus[],
  ]),
  clockInAt: z.string().optional().nullable(),
  clockOutAt: z.string().optional().nullable(),
  notes: z.string().trim().max(300, "Too long").or(z.literal("")),
});
export type AttendanceCorrectionInput = z.infer<typeof attendanceCorrectionSchema>;

export const markAttendanceSchema = z.object({
  employeeId: z.string().uuid("Select an employee"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  status: z.enum(["PRESENT", "LATE", "ABSENT", "ON_LEAVE", "HOLIDAY"] as [
    AttendanceStatus,
    ...AttendanceStatus[],
  ]),
  clockInAt: z.string().optional().nullable(),
  clockOutAt: z.string().optional().nullable(),
  notes: z.string().trim().max(300, "Too long").or(z.literal("")),
});
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;

export const leaveRequestSchema = z.object({
  type: z.enum(LEAVE_TYPES.map((t) => t.value) as [LeaveType, ...LeaveType[]]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().trim().max(500, "Too long").or(z.literal("")),
});
export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;

export const payrollRuleSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM (e.g. 08:00)"),
  graceMinutes: z.coerce.number().int().min(0).max(120),
  standardMinutesPerDay: z.coerce.number().int().min(60).max(720),
  overtimeRate: z.coerce.number().min(1).max(3),
  dailyOvertimeThresholdMin: z.coerce.number().int().min(360).max(960),
  defaultPayday: z.coerce.number().int().min(1).max(28),
  bonusEnabled: z.boolean(),
  overtimeEnabled: z.boolean(),
  allowancesEnabled: z.boolean(),
  deductionLoan: z.coerce.number().min(0),
  deductionDamages: z.coerce.number().min(0),
  deductionUniform: z.coerce.number().min(0),
  deductionTransport: z.coerce.number().min(0),
  deductionMeals: z.coerce.number().min(0),
  deductionAdvances: z.coerce.number().min(0),
  deductionOther: z.coerce.number().min(0),
  notes: z.string().trim().max(300).or(z.literal("")),
});
export type PayrollRuleInput = z.infer<typeof payrollRuleSchema>;

export const payslipAdjustSchema = z.object({
  overtimeHours: z.coerce.number().min(0).optional(),
  overtimeAmount: z.coerce.number().min(0).optional(),
  bonusAmount: z.coerce.number().min(0).optional(),
  allowancesAmount: z.coerce.number().min(0).optional(),
  deductionLoan: z.coerce.number().min(0).optional(),
  deductionDamages: z.coerce.number().min(0).optional(),
  deductionUniform: z.coerce.number().min(0).optional(),
  deductionTransport: z.coerce.number().min(0).optional(),
  deductionMeals: z.coerce.number().min(0).optional(),
  deductionAdvances: z.coerce.number().min(0).optional(),
  deductionOther: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(300).or(z.literal("")),
});
export type PayslipAdjustInput = z.infer<typeof payslipAdjustSchema>;

/* ---------------------------- Inventory ---------------------------- */

export const inventoryItemSchema = z.object({
  name: z.string().trim().min(2, "Product name is required"),
  sku: z.string().trim().min(2, "SKU is required").toUpperCase(),
  category: z.enum(
    INVENTORY_CATEGORIES.map((c) => c.value) as [InventoryCategory, ...InventoryCategory[]],
  ),
  supplier: z.string().trim().max(100).or(z.literal("")),
  unit: z.string().trim().min(1, "Unit is required"),
  costPrice: z.coerce.number().min(0, "Cost can't be negative"),
  sellingPrice: z.coerce.number().min(0, "Price can't be negative"),
  quantityAvailable: z.coerce.number().min(0, "Quantity can't be negative"),
  minimumQuantity: z.coerce.number().min(0),
  maximumQuantity: z.coerce.number().min(0),
  reorderLevel: z.coerce.number().min(0),
  storageLocation: z.string().trim().max(100).or(z.literal("")),
});
export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;

/* ----------------------------- Expenses ---------------------------- */

export const expenseSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  category: z.enum(
    EXPENSE_CATEGORIES.map((c) => c.value) as [ExpenseCategory, ...ExpenseCategory[]],
  ),
  vendor: z.string().trim().max(120).or(z.literal("")),
  description: longTextOrEmpty,
  paymentMethod: z.enum(
    PAYMENT_METHODS.map((m) => m.value) as [PaymentMethod, ...PaymentMethod[]],
  ),
  expenseDate: z.string().min(1, "Expense date is required"),
  employeeId: z.string().optional().or(z.literal("")),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

export const voidReceiptSchema = z.object({
  reason: z.string().trim().min(5, "Explain why this receipt is being voided"),
});
export type VoidReceiptInput = z.infer<typeof voidReceiptSchema>;

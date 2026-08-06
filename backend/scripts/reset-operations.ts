import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/* ===================================================================== */
/* Reset operational data — keeps the system ready for production.       */
/* --------------------------------------------------------------------- */
/* Keeps:  Branch, Role, Permission, RolePermission, User, Settings      */
/*         (minus per-day reference counters), PayrollRule.              */
/* Wipes:  receipts, washes, bookings, expenses, inventory movements,    */
/*         salary payments, time entries, attendance records, leave      */
/*         requests, payroll runs, payslips, notifications, audit logs,  */
/*         customers, vehicles, inventory, employees, services.          */
/* Re-creates the 4 seed logins' employee records (admin/manager/        */
/* cashier/attendant) so login-based attendance keeps working.           */
/* Also ensures the bookings permissions exist on every active role.     */
/* ===================================================================== */

// Prefer the direct (non-pooled) Neon endpoint: PgBouncer caps the pool at 5
// connections, which starves under network jitter. The retry loop below handles
// the remaining flakiness.
const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
});

const BOOKING_PERMISSIONS = [
  { key: "bookings:view", module: "BOOKINGS", name: "View bookings", description: "See the appointment calendar and bookings" },
  { key: "bookings:manage", module: "BOOKINGS", name: "Manage bookings", description: "Create, reschedule and update bookings" },
];

/* Retry transient Neon connection drops/timeouts (P1001/P1002/P1017/P2024) —
   every step is idempotent, so a failed attempt can simply be retried. */
const RETRIES = 8;
async function retry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const code = err?.code;
      if ((code === "P1001" || code === "P1002" || code === "P1017" || code === "P2024") && attempt < RETRIES) {
        console.log(`[reset] ${label} failed (${code}) — retry ${attempt}/${RETRIES - 1}`);
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`unreachable: ${label}`);
}

async function main() {
  console.log("[reset] Starting…");

  // ---- Wipe operational tables (FK-safe order) ----
  await retry("payslips", () => prisma.payslip.deleteMany({}));
  await retry("payroll runs", () => prisma.payrollRun.deleteMany({}));
  await retry("receipts", () => prisma.receipt.deleteMany({}));
  await retry("wash records", () => prisma.washRecord.deleteMany({}));
  await retry("bookings", () => prisma.booking.deleteMany({}));
  await retry("expenses", () => prisma.expense.deleteMany({}));
  await retry("inventory movements", () => prisma.inventoryMovement.deleteMany({}));
  await retry("salary payments", () => prisma.salaryPayment.deleteMany({}));
  await retry("time entries", () => prisma.timeEntry.deleteMany({}));
  await retry("attendance records", () => prisma.attendanceRecord.deleteMany({}));
  await retry("leave requests", () => prisma.leaveRequest.deleteMany({}));
  await retry("notifications", () => prisma.notification.deleteMany({}));
  await retry("audit logs", () => prisma.auditLog.deleteMany({}));
  await retry("service requirements", () => prisma.serviceInventoryRequirement.deleteMany({}));
  await retry("vehicles", () => prisma.vehicle.deleteMany({}));
  await retry("customers", () => prisma.customer.deleteMany({}));
  await retry("inventory", () => prisma.inventoryItem.deleteMany({}));
  await retry("employees", () => prisma.employee.deleteMany({}));
  await retry("services", () => prisma.service.deleteMany({}));
  console.log("[reset] Operational records wiped");

  // ---- Reset per-day reference counters (WF_COUNTER_*, RCP_COUNTER_*, BK_COUNTER_*) ----
  const counters = await prisma.settings.findMany({ where: { key: { contains: "_COUNTER_" } } });
  if (counters.length > 0) {
    await prisma.settings.deleteMany({ where: { id: { in: counters.map((c) => c.id) } } });
    console.log(`[reset] ${counters.length} reference counters reset`);
  }

  // ---- Ensure bookings permissions exist + attach to every active role ----
  for (const p of BOOKING_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { module: p.module, name: p.name, description: p.description },
      create: p,
    });
  }
  const perms = await prisma.permission.findMany({ where: { key: { in: BOOKING_PERMISSIONS.map((p) => p.key) } } });
  const roles = await prisma.role.findMany({ where: { isActive: true } });
  for (const role of roles) {
    for (const perm of perms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }
  console.log(`[reset] Bookings permissions attached to ${roles.length} active roles`);

  // ---- Re-create the seed logins' employee records ----
  // Kept so clock-in-on-login still feeds attendance after the wipe.
  const users = await prisma.user.findMany();
  const byUsername = new Map(users.map((u) => [u.username, u]));
  const staff: { username: string; firstName: string; lastName: string; position: string; salary: number | null; payrollEnabled: boolean }[] = [
    { username: "admin", firstName: "Mig", lastName: "Flares", position: "Owner", salary: null, payrollEnabled: false },
    { username: "manager", firstName: "Chanda", lastName: "Mulenga", position: "Manager", salary: 7000, payrollEnabled: true },
    { username: "cashier", firstName: "Peter", lastName: "Zimba", position: "Cashier", salary: 3200, payrollEnabled: true },
    { username: "attendant", firstName: "Collins", lastName: "Sakala", position: "Attendant", salary: 2800, payrollEnabled: true },
  ];
  let recreated = 0;
  for (const s of staff) {
    const user = byUsername.get(s.username);
    if (!user) continue;
    await prisma.employee.create({
      data: {
        firstName: s.firstName,
        lastName: s.lastName,
        position: s.position,
        phone: user.phone ?? "",
        email: user.email ?? null,
        salary: s.salary,
        payday: 25,
        employmentType: "FULL_TIME",
        payrollEnabled: s.payrollEnabled,
        attendanceRequired: true,
        overtimeEligible: true,
        isActive: true,
        userId: user.id,
        branchId: user.branchId,
      },
    });
    recreated++;
  }
  console.log(`[reset] Re-created ${recreated} employee records linked to seed logins`);

  // ---- Integrity guard: every seeded login still works ----
  const admin = byUsername.get("admin");
  if (!admin) {
    console.log("[reset] WARN: admin user missing — run `npm run db:seed` to recreate logins.");
  } else if (!(await bcrypt.compare("admin123", admin.passwordHash))) {
    console.log("[reset] WARN: admin password no longer matches seed default.");
  } else {
    console.log("[reset] Logins intact (admin/admin123).");
  }

  const counts = {
    customers: await prisma.customer.count(),
    vehicles: await prisma.vehicle.count(),
    services: await prisma.service.count(),
    inventory: await prisma.inventoryItem.count(),
    employees: await prisma.employee.count(),
    washes: await prisma.washRecord.count(),
    receipts: await prisma.receipt.count(),
    bookings: await prisma.booking.count(),
    expenses: await prisma.expense.count(),
    notifications: await prisma.notification.count(),
    auditLogs: await prisma.auditLog.count(),
    attendance: await prisma.attendanceRecord.count(),
    leave: await prisma.leaveRequest.count(),
    payrollRuns: await prisma.payrollRun.count(),
  };
  console.log("[reset] Post-reset counts:", counts);
}

main()
  .catch((err) => {
    console.error("[reset] Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

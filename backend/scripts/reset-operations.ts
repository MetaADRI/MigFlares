import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/* ===================================================================== */
/* Reset operational data — keeps the system ready for production.       */
/* --------------------------------------------------------------------- */
/* Keeps:  Branch, Role, Permission, RolePermission, User, Settings.     */
/* Wipes:  receipts, washes, bookings, expenses, inventory movements,    */
/*         notifications, audit logs, customers, vehicles, inventory,    */
/*         employees, services, and per-day reference counters.          */
/* Also ensures the bookings permissions exist on every active role.     */
/* ===================================================================== */

const prisma = new PrismaClient();

const BOOKING_PERMISSIONS = [
  { key: "bookings:view", module: "BOOKINGS", name: "View bookings", description: "See the appointment calendar and bookings" },
  { key: "bookings:manage", module: "BOOKINGS", name: "Manage bookings", description: "Create, reschedule and update bookings" },
];

async function main() {
  console.log("[reset] Starting…");

  // ---- Wipe operational tables (FK-safe order) ----
  await prisma.receipt.deleteMany({});
  await prisma.washRecord.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.inventoryMovement.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.serviceInventoryRequirement.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.service.deleteMany({});
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

  // ---- Integrity guard: every seeded login still works ----
  const admin = await prisma.user.findUnique({ where: { username: "admin" } });
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
  };
  console.log("[reset] Post-reset counts:", counts);
}

main()
  .catch((err) => {
    console.error("[reset] Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

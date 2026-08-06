import { prisma } from "../config/database.js";

/**
 * Generate a human-friendly sequential reference such as WF-20260806-0001.
 * Counters are stored per-day in the Settings table; the read-modify-write
 * is intentionally simple for the scaffold (see Phase 2 hardening notes).
 */
export async function generateReference(prefix: "WF" | "RCP" | "BK"): Promise<string> {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const key = `${prefix}_COUNTER_${datePart}`;

  let setting = await prisma.settings.findFirst({ where: { key, branchId: null } });
  if (!setting) {
    setting = await prisma.settings.create({ data: { key, value: 1, branchId: null } });
  } else {
    setting = await prisma.settings.update({
      where: { id: setting.id },
      data: { value: Number(setting.value) + 1 },
    });
  }

  const current = Number(setting.value) || 1;
  return `${prefix}-${datePart}-${String(current).padStart(4, "0")}`;
}

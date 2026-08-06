import type { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";

/* ------------------------------------------------------------------ */
/* Business settings — a key/value store with sensible defaults.       */
/* ------------------------------------------------------------------ */

export const DEFAULT_SETTINGS: Record<string, Prisma.InputJsonValue> = {
  "business.name": "Mig Flares Car Wash",
  "business.logo": "",
  "business.phone": "+260 977 000 001",
  "business.email": "info@migflares.co.zm",
  "business.address": "Nkoloma Stadium, Lusaka, Zambia",
  "business.taxNumber": "ZMW-1000456789",
  "business.currency": "ZMW",
  "business.timezone": "Africa/Lusaka",
  "business.hours": "Mon–Sat 08:00–18:00, Sun 09:00–15:00",
  "receipt.footer": "Thank you for washing with Mig Flares!",
  "receipt.prefix": "RCP",
  "receipt.numberFormat": "RCP-{date}-{seq:4}",
  "receipt.showTax": "false",
  "prefs.theme": "system",
  "prefs.language": "en",
  "prefs.dateFormat": "DD MMM YYYY",
  "prefs.backupFrequency": "daily",
  "security.passwordPolicy": "medium",
  "security.sessionTimeout": "60",
  "security.twoFactorEnabled": "false",
};

export async function getSettings(branchId: string | null): Promise<Record<string, string>> {
  const rows = await prisma.settings.findMany({ where: branchId ? { branchId } : {} });
  const stored = new Map(rows.map((r) => [r.key, String(r.value)]));
  const merged: Record<string, string> = {};
  for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
    merged[key] = stored.get(key) ?? String(defaultValue);
  }
  return merged;
}

/** Upsert multiple settings at once. Returns the merged result. */
export async function updateSettings(
  values: Record<string, string>,
  userId: string,
  branchId: string | null,
) {
  await prisma.$transaction(async (tx) => {
    for (const [key, value] of Object.entries(values)) {
      const existing = await tx.settings.findFirst({
        where: { key, branchId: branchId ?? null },
      });
      if (existing) {
        await tx.settings.update({
          where: { id: existing.id },
          data: { value: value as Prisma.InputJsonValue, updatedById: userId },
        });
      } else {
        await tx.settings.create({
          data: { key, value: value as Prisma.InputJsonValue, branchId, updatedById: userId },
        });
      }
    }
  });
  return getSettings(branchId);
}

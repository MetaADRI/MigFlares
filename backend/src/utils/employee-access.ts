import { prisma } from "../config/database.js";
import { ApiError } from "./api-error.js";

export async function getOwnEmployeeId(userId: string): Promise<string | null> {
  const employee = await prisma.employee.findUnique({
    where: { userId },
    select: { id: true },
  });
  return employee?.id ?? null;
}

export async function requireOwnEmployee(userId: string): Promise<string> {
  const employeeId = await getOwnEmployeeId(userId);
  if (!employeeId) {
    throw ApiError.forbidden("No employee profile is linked to your account");
  }
  return employeeId;
}

export function hasPermission(user: { permissions?: string[] } | null | undefined, key: string): boolean {
  return Boolean(user && (user.permissions ?? []).includes(key));
}

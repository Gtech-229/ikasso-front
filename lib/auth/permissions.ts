import type { CurrentAdmin } from "@/lib/api/admin-auth";

/** The API's permission names (backend `src/admin-auth/permissions.ts`). */
export const PERMISSIONS = [
  "countries.read",
  "countries.manage",
  "stores.read",
  "stores.manage",
  "store-settings.manage",
  "settings.read",
  "settings.manage",
  "subscriptions.read",
  "subscriptions.manage",
  "accounts.read",
  "accounts.manage",
  "disputes.read",
  "activity.read",
  "stats.read",
  "alerts.read",
  "alerts.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

type AdminAccess = Pick<CurrentAdmin, "role" | "permissions">;

/**
 * Whether the admin may see a page or an action. Convenience only: the API
 * checks every request. It returns every permission for a super admin, and a
 * name this list does not know yet is simply never asked about.
 */
export function can(admin: AdminAccess, permission: Permission): boolean {
  return admin.permissions.includes(permission);
}

/** Admins and roles are managed by super admins only (no permission for it). */
export function isSuperAdmin(admin: AdminAccess): boolean {
  return admin.role === "SUPER_ADMIN";
}

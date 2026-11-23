import { z } from "zod";
import { apiFetch } from "./client";

/** An admin as the super admin sees it (`GET /admin/admins`, super admin only). */
export const adminSummarySchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum(["SUPER_ADMIN", "ADMIN"]),
  /** False until the admin chose a password from the emailed link. */
  hasPassword: z.boolean(),
  /** False when deactivated (sign-in refused). */
  isActive: z.boolean(),
  /** Null for the super admin, who has every permission and no role. */
  roleId: z.string().nullable(),
  createdAt: z.string(),
});
export type AdminSummary = z.infer<typeof adminSummarySchema>;

export const adminsQueryKey = ["admins"] as const;

export const ADMINS_PATH = "/admin/admins";

export function fetchAdmins(): Promise<AdminSummary[]> {
  return apiFetch(ADMINS_PATH, { schema: z.array(adminSummarySchema) });
}

export type AdminDetails = { email: string; firstName: string; lastName: string };

const adminPath = (id: string) => `${ADMINS_PATH}/${encodeURIComponent(id)}`;

/** `POST /admin/admins`: an ADMIN without a password; no email is sent. */
export function createAdmin(body: AdminDetails & { roleId: string }): Promise<AdminSummary> {
  return apiFetch(ADMINS_PATH, { method: "POST", body, schema: adminSummarySchema });
}

/** `PATCH /admin/admins/:id`: only the sent fields change; a new email retires unused links. */
export function updateAdmin(id: string, changes: Partial<AdminDetails>): Promise<AdminSummary> {
  return apiFetch(adminPath(id), { method: "PATCH", body: changes, schema: adminSummarySchema });
}

/** `PATCH /admin/admins/:id/role`: effective from the admin's next request. */
export function assignAdminRole(id: string, roleId: string): Promise<AdminSummary> {
  return apiFetch(`${adminPath(id)}/role`, { method: "PATCH", body: { roleId }, schema: adminSummarySchema });
}

/** `PATCH /admin/admins/:id/deactivate`: sign-in refused, sessions closed at once. */
export function deactivateAdmin(id: string): Promise<AdminSummary> {
  return apiFetch(`${adminPath(id)}/deactivate`, { method: "PATCH", schema: adminSummarySchema });
}

/** `PATCH /admin/admins/:id/activate`: sign-in allowed again. */
export function activateAdmin(id: string): Promise<AdminSummary> {
  return apiFetch(`${adminPath(id)}/activate`, { method: "PATCH", schema: adminSummarySchema });
}

import { z } from "zod";
import { apiFetch } from "./client";

/** `GET /admin/roles` (super admin only). */
export const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  // Plain strings: a permission added by the API must not break parsing.
  permissions: z.array(z.string()),
  adminCount: z.number().int(),
});
export type Role = z.infer<typeof roleSchema>;

export const rolesQueryKey = ["roles"] as const;

export const ROLES_PATH = "/admin/roles";

export function fetchRoles(): Promise<Role[]> {
  return apiFetch(ROLES_PATH, { schema: z.array(roleSchema) });
}

/** `GET /admin/permissions`: what a role can give, with its French label. */
export const permissionSchema = z.object({ name: z.string(), label: z.string() });
export type PermissionView = z.infer<typeof permissionSchema>;

export const permissionsQueryKey = ["permissions"] as const;

export const PERMISSIONS_PATH = "/admin/permissions";

export function fetchPermissions(): Promise<PermissionView[]> {
  return apiFetch(PERMISSIONS_PATH, { schema: z.array(permissionSchema) });
}

export type RoleBody = { name: string; permissions: string[] };

const rolePath = (id: string) => `${ROLES_PATH}/${encodeURIComponent(id)}`;

/** `POST /admin/roles`: a new role (409 ROLE_NAME_TAKEN). */
export function createRole(body: RoleBody): Promise<Role> {
  return apiFetch(ROLES_PATH, { method: "POST", body, schema: roleSchema });
}

/**
 * `PATCH /admin/roles/:roleId`: only the sent fields change; new permissions
 * replace the old ones from each of its admins' next request.
 */
export function updateRole(id: string, changes: Partial<RoleBody>): Promise<Role> {
  return apiFetch(rolePath(id), { method: "PATCH", body: changes, schema: roleSchema });
}

/** `DELETE /admin/roles/:roleId` (204); 409 ROLE_IN_USE while an admin holds it. */
export function deleteRole(id: string): Promise<void> {
  return apiFetch(rolePath(id), { method: "DELETE" });
}

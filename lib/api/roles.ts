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

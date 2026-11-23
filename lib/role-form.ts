import { z } from "zod";

// The API's message (CreateRoleDto, UpdateRoleDto). Permissions are set in the
// grid (lib/role-permissions.ts), not in the name dialog.
const NAME_MESSAGE = "Le nom du rôle doit contenir 1 à 60 caractères";

export const roleNameSchema = z.object({
  name: z.string().trim().min(1, NAME_MESSAGE).max(60, NAME_MESSAGE),
});
export type RoleNameInput = z.input<typeof roleNameSchema>;
export type RoleNameValues = z.output<typeof roleNameSchema>;

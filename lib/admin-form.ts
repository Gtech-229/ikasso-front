import { z } from "zod";
import type { AdminDetails, AdminSummary } from "@/lib/api/admins";
import { changedFields } from "@/lib/store-forms";

// The API's messages (CreateAdminDto, UpdateAdminDto, AssignRoleDto).
const EMAIL_MESSAGE = "L’adresse email est invalide";
const FIRST_NAME_MESSAGE = "Le prénom doit contenir 1 à 100 caractères";
const LAST_NAME_MESSAGE = "Le nom doit contenir 1 à 100 caractères";
export const ROLE_REQUIRED_MESSAGE = "Choisissez un rôle";

const detailsShape = {
  // Trimmed and lowercased, as the API stores it.
  email: z.string().trim().toLowerCase().pipe(z.email({ error: EMAIL_MESSAGE })),
  firstName: z.string().trim().min(1, FIRST_NAME_MESSAGE).max(100, FIRST_NAME_MESSAGE),
  lastName: z.string().trim().min(1, LAST_NAME_MESSAGE).max(100, LAST_NAME_MESSAGE),
};

/** Creating: the details and the role. */
export const createAdminFormSchema = z.object({
  ...detailsShape,
  roleId: z.string().min(1, ROLE_REQUIRED_MESSAGE),
});
export type CreateAdminFormInput = z.input<typeof createAdminFormSchema>;
export type CreateAdminFormValues = z.output<typeof createAdminFormSchema>;

/** Editing: the details only (the role has its own dialog). */
export const editAdminFormSchema = z.object(detailsShape);
export type EditAdminFormInput = z.input<typeof editAdminFormSchema>;
export type EditAdminFormValues = z.output<typeof editAdminFormSchema>;

export const roleFormSchema = z.object({ roleId: z.string().min(1, ROLE_REQUIRED_MESSAGE) });
export type RoleFormValues = z.infer<typeof roleFormSchema>;

export function adminDetails(admin: AdminSummary): AdminDetails {
  return { email: admin.email, firstName: admin.firstName, lastName: admin.lastName };
}

/** The edit body: only what differs from the admin the dialog opened with. */
export function adminChanges(initial: AdminSummary, values: EditAdminFormValues): Partial<AdminDetails> {
  return changedFields(adminDetails(initial), values);
}

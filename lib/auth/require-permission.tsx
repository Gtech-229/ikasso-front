import "server-only";

import { Forbidden } from "@/components/forbidden";
import { getCurrentAdmin } from "./current-admin";
import { can, isSuperAdmin, type Permission } from "./permissions";

/**
 * Shows the 403 view instead of a page the admin's role may not open. Hiding is
 * convenience: the API still checks every request.
 */
export async function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();
  // Rendered inside the page, under its title: the embedded variant.
  return can(admin, permission) ? children : <Forbidden embedded />;
}

/**
 * Admins and roles pages: the super admin only (the API has no permission for
 * them). Shows the 403 view to anyone else; the API still checks every request.
 */
export async function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin();
  return isSuperAdmin(admin) ? children : <Forbidden embedded />;
}

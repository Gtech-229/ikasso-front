import type { PermissionView, Role } from "@/lib/api/roles";

/**
 * The grid's modules, in display order. The API gives each permission a label
 * but no module: the frontend groups them by the code's prefix.
 */
const MODULES: { label: string; prefixes: readonly string[] }[] = [
  { label: "Pays", prefixes: ["countries"] },
  { label: "Quincailleries", prefixes: ["stores", "store-settings"] },
  { label: "Abonnements", prefixes: ["subscriptions"] },
  { label: "Comptes clients", prefixes: ["accounts"] },
  { label: "Support", prefixes: ["disputes", "alerts"] },
  { label: "Journal d’activité", prefixes: ["activity"] },
  { label: "Statistiques", prefixes: ["stats"] },
  { label: "Paramètres de la plateforme", prefixes: ["settings"] },
];
const OTHER_MODULE = "Autres";

export type PermissionModule = { label: string; permissions: PermissionView[] };

const prefixOf = (name: string) => name.split(".")[0] ?? name;

/** The permissions grouped by module, keeping the API's order inside each; empty modules dropped. */
export function permissionModules(permissions: readonly PermissionView[]): PermissionModule[] {
  const known = MODULES.map((module) => ({
    label: module.label,
    permissions: permissions.filter((permission) => module.prefixes.includes(prefixOf(permission.name))),
  }));
  const grouped = new Set(MODULES.flatMap((module) => module.prefixes));
  const others = permissions.filter((permission) => !grouped.has(prefixOf(permission.name)));
  return [...known, { label: OTHER_MODULE, permissions: others }].filter((module) => module.permissions.length > 0);
}

/**
 * Pending ticks: for each role the admin touched, the full permission list it
 * would have once saved. A role absent from the draft keeps its saved list, so
 * it follows the server when the roles reload.
 */
export type PermissionDraft = Readonly<Record<string, readonly string[]>>;

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((item) => b.includes(item));

/** The list a role shows in the grid: its pending one, or its saved one. */
export function effectivePermissions(role: Role, draft: PermissionDraft): readonly string[] {
  return draft[role.id] ?? role.permissions;
}

/** Whether this cell differs from what is saved. */
export function isCellChanged(role: Role, draft: PermissionDraft, permission: string): boolean {
  return effectivePermissions(role, draft).includes(permission) !== role.permissions.includes(permission);
}

/**
 * Sets one role's pending list, in the API's permission order. A list equal to
 * the saved one is no longer pending.
 */
function withRole(draft: PermissionDraft, role: Role, next: Iterable<string>, order: readonly string[]): PermissionDraft {
  const wanted = new Set(next);
  const list = order.filter((name) => wanted.has(name));
  const rest = { ...draft };
  delete rest[role.id];
  return sameSet(list, role.permissions) ? rest : { ...rest, [role.id]: list };
}

/** Ticks or unticks one cell. */
export function setCell(
  draft: PermissionDraft,
  role: Role,
  permission: string,
  checked: boolean,
  order: readonly string[],
): PermissionDraft {
  const current = new Set(effectivePermissions(role, draft));
  if (checked) current.add(permission);
  else current.delete(permission);
  return withRole(draft, role, current, order);
}

/** Whether a role has every permission ticked (its header toggle then unticks all). */
export function isColumnFull(role: Role, draft: PermissionDraft, order: readonly string[]): boolean {
  const current = effectivePermissions(role, draft);
  return order.every((name) => current.includes(name));
}

/** The header toggle: every permission for the role, or none when it already has them all. */
export function toggleColumn(draft: PermissionDraft, role: Role, order: readonly string[]): PermissionDraft {
  return withRole(draft, role, isColumnFull(role, draft, order) ? [] : order, order);
}

/** Whether every role has this permission ticked (its row toggle then unticks it for all). */
export function isRowFull(roles: readonly Role[], draft: PermissionDraft, permission: string): boolean {
  return roles.every((role) => effectivePermissions(role, draft).includes(permission));
}

/** The row toggle: the permission for every role, or for none when all have it. */
export function toggleRow(
  draft: PermissionDraft,
  roles: readonly Role[],
  permission: string,
  order: readonly string[],
): PermissionDraft {
  const checked = !isRowFull(roles, draft, permission);
  return roles.reduce((next, role) => setCell(next, role, permission, checked, order), draft);
}

/** Drops pending lists of roles that no longer exist or now match what is saved. */
export function cleanDraft(draft: PermissionDraft, roles: readonly Role[]): PermissionDraft {
  const clean: Record<string, readonly string[]> = {};
  for (const role of roles) {
    const pending = draft[role.id];
    if (pending && !sameSet(pending, role.permissions)) clean[role.id] = pending;
  }
  return clean;
}

/** How many cells differ from what is saved. */
export function changedCellCount(roles: readonly Role[], draft: PermissionDraft): number {
  return roles.reduce((count, role) => {
    const pending = draft[role.id];
    if (!pending) return count;
    const added = pending.filter((name) => !role.permissions.includes(name)).length;
    const removed = role.permissions.filter((name) => !pending.includes(name)).length;
    return count + added + removed;
  }, 0);
}

/** The roles to save, each with its whole new list (the API replaces it). */
export function changedRoles(roles: readonly Role[], draft: PermissionDraft): { role: Role; permissions: string[] }[] {
  return roles.flatMap((role) => {
    const pending = draft[role.id];
    return pending && !sameSet(pending, role.permissions) ? [{ role, permissions: [...pending] }] : [];
  });
}

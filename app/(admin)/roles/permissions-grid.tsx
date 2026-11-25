"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { isApiError, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import { rolesQueryKey, updateRole, type PermissionView, type Role } from "@/lib/api/roles";
import {
  changedCellCount,
  changedRoles,
  cleanDraft,
  effectivePermissions,
  isCellChanged,
  isColumnFull,
  isRowFull,
  permissionModules,
  setCell,
  toggleColumn,
  toggleRow,
  type PermissionDraft,
} from "@/lib/role-permissions";
import { cn } from "@/lib/utils";

type SaveFailure = { role: Role; message: string };

/**
 * One row per permission, grouped by module; one checkbox column per role.
 * Ticks stay pending until "Enregistrer les modifications" (user revision,
 * reference: blueprint/reference/roles-permissions-grid.png).
 */
export function PermissionsGrid({ roles, permissions }: { roles: Role[]; permissions: PermissionView[] }) {
  const queryClient = useQueryClient();
  const order = permissions.map((permission) => permission.name);
  const modules = permissionModules(permissions);
  const [rawDraft, setDraft] = useState<PermissionDraft>({});
  const [failures, setFailures] = useState<SaveFailure[]>([]);
  // Roles reloaded: drop pending lists of deleted roles or now equal to what is saved.
  const draft = cleanDraft(rawDraft, roles);
  const changes = changedCellCount(roles, draft);

  const save = useMutation({
    mutationFn: async () => {
      const toSave = changedRoles(roles, draft);
      const settled = await Promise.allSettled(
        toSave.map(({ role, permissions: list }) => updateRole(role.id, { permissions: list })),
      );
      return toSave.map(({ role }, index) => ({ role, outcome: settled[index] }));
    },
    onSuccess: (results) => {
      const failed: SaveFailure[] = [];
      const next: Record<string, readonly string[]> = { ...draft };
      for (const { role, outcome } of results) {
        if (outcome.status === "fulfilled") {
          delete next[role.id];
          // Show the saved list at once, before the reload.
          queryClient.setQueryData<Role[]>(rolesQueryKey, (old) =>
            old?.map((item) => (item.id === outcome.value.id ? outcome.value : item)),
          );
        } else {
          const reason = outcome.reason;
          failed.push({ role, message: isApiError(reason) ? reason.message : UNEXPECTED_ERROR_MESSAGE });
        }
      }
      setDraft(next);
      setFailures(failed);
      void queryClient.invalidateQueries({ queryKey: rolesQueryKey });
      if (failed.length === 0) toast.success("Permissions enregistrées.");
    },
  });

  const saving = save.isPending;
  const update = (next: PermissionDraft) => {
    setDraft(next);
    setFailures([]);
  };
  const holders = roles.filter((role) => role.adminCount > 0).length;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div aria-busy={saving || undefined} className="min-w-0 overflow-x-auto rounded-card bg-surface p-2 md:p-4">
        {/* No border under the grid's very last row (rows are grouped in one tbody per module). */}
        <table className="w-full min-w-[40rem] border-collapse text-[15px] [&>tbody:last-child>tr:last-child]:border-0">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="sticky left-0 z-10 bg-surface px-3 py-2 text-left text-[13px] font-semibold text-muted-ink uppercase">
                Permissions
              </th>
              {roles.map((role) => {
                const full = isColumnFull(role, draft, order);
                return (
                  <th key={role.id} scope="col" className="px-3 py-2 text-center text-[14px] font-semibold">
                    <div className="flex items-center justify-center gap-1">
                      <span>{role.name}</span>
                      <ToggleButton
                        label={`${full ? "Tout décocher" : "Tout cocher"} pour ${role.name}`}
                        active={full}
                        disabled={saving}
                        onClick={() => update(toggleColumn(draft, role, order))}
                      />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          {/* One tbody per module (F-08): each scope="rowgroup" header then covers
              only its own module's rows. */}
          {modules.map((module) => (
              <tbody key={module.label}>
                <tr className="border-b border-border bg-muted/40">
                  <th scope="rowgroup" className="sticky left-0 z-10 bg-muted px-3 pt-4 pb-2 text-left font-display text-[15px] font-bold">
                    {module.label}
                  </th>
                  {roles.map((role) => (
                    <td key={role.id} className="px-3 pt-4 pb-2 text-center text-[13px] text-muted-ink">
                      {role.name}
                    </td>
                  ))}
                </tr>
                {module.permissions.map((permission) => {
                  const full = isRowFull(roles, draft, permission.name);
                  return (
                    <tr key={permission.name} className="border-b border-border">
                      <th scope="row" className="sticky left-0 z-10 bg-surface px-3 py-2 text-left font-normal">
                        <div className="flex items-start gap-2">
                          <ToggleButton
                            label={`${full ? "Tout décocher" : "Tout cocher"} : ${permission.label}`}
                            active={full}
                            disabled={saving}
                            onClick={() => update(toggleRow(draft, roles, permission.name, order))}
                          />
                          <span className="flex flex-col">
                            {permission.label}
                            <span className="font-mono text-[12px] text-muted-ink">{permission.name}</span>
                          </span>
                        </div>
                      </th>
                      {roles.map((role) => {
                        const changed = isCellChanged(role, draft, permission.name);
                        return (
                          <td
                            key={role.id}
                            className={cn("px-3 py-2 text-center", changed && "bg-brand/25")}
                            data-changed={changed || undefined}
                          >
                            <Checkbox
                              aria-label={`${permission.label} — ${role.name}`}
                              checked={effectivePermissions(role, draft).includes(permission.name)}
                              disabled={saving}
                              onCheckedChange={(checked) =>
                                update(setCell(draft, role, permission.name, checked, order))
                              }
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
          ))}
        </table>
      </div>

      {holders > 0 && (
        <p className="text-[14px] text-muted-ink">
          Les permissions enregistrées s’appliquent aux administrateurs du rôle dès leur requête suivante.
        </p>
      )}

      {(changes > 0 || failures.length > 0) && (
        <div
          role="region"
          aria-label="Modifications en attente"
          className="sticky bottom-0 flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-sm"
        >
          {failures.length > 0 && (
            <div role="alert" className="rounded-control bg-danger/10 px-4 py-3 text-[15px] text-danger">
              <p className="font-semibold">Ces rôles n’ont pas été enregistrés :</p>
              <ul className="mt-1 list-disc pl-5">
                {failures.map(({ role, message }) => (
                  <li key={role.id}>
                    {role.name} : {message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {changes > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p aria-live="polite" className="text-[15px] font-semibold">
                {changes} modification{changes > 1 ? "s" : ""} non enregistrée{changes > 1 ? "s" : ""}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" disabled={saving} onClick={() => update({})}>
                  Annuler
                </Button>
                <Button variant="action" disabled={saving} onClick={() => save.mutate()}>
                  {saving ? "Enregistrement…" : "Enregistrer les modifications"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** The tick-all / untick-all button of a role column or a permission row. */
function ToggleButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn("shrink-0", active ? "text-success" : "text-muted-ink")}
    >
      <CheckCheck aria-hidden="true" className="size-4" />
    </Button>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Forbidden } from "@/components/forbidden";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isApiError, isForbidden, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import { fetchPermissions, fetchRoles, permissionsQueryKey, rolesQueryKey, type Role } from "@/lib/api/roles";
import { PermissionsGrid } from "./permissions-grid";
import { RoleDeleteDialog } from "./role-delete-dialog";
import { RoleFormDialog } from "./role-form-dialog";

export const ROLES_HEADING_ID = "roles-list";

type Opened = { kind: "form"; role: Role | null } | { kind: "delete"; role: Role } | null;

export function focusRolesList() {
  document.getElementById(ROLES_HEADING_ID)?.focus();
}

/** Two lists: the roles, then the permissions grid (user revision, 2026-11-23). */
export function RolesView() {
  const roles = useQuery({ queryKey: rolesQueryKey, queryFn: fetchRoles, meta: { inlineError: true } });
  const permissions = useQuery({
    queryKey: permissionsQueryKey,
    queryFn: fetchPermissions,
    meta: { inlineError: true },
  });
  const [opened, setOpened] = useState<Opened>(null);

  const failed = roles.isError ? roles : permissions.isError ? permissions : null;
  if (failed) {
    if (isForbidden(failed.error)) return <Forbidden embedded />;
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-card bg-surface p-6">
        <p className="text-[15px] text-danger">
          {isApiError(failed.error) ? failed.error.message : UNEXPECTED_ERROR_MESSAGE}
        </p>
        <Button variant="secondary" onClick={() => failed.refetch()}>
          Réessayer
        </Button>
      </div>
    );
  }

  const list = roles.data;
  const permissionList = permissions.data;

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <section aria-labelledby={ROLES_HEADING_ID} className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id={ROLES_HEADING_ID} tabIndex={-1} className="font-display text-[22px] font-bold outline-none">
              Rôles
            </h2>
            <p className="max-w-2xl text-[15px] text-muted-ink">
              Le super administrateur a toutes les permissions et n’a pas de rôle.
            </p>
          </div>
          <Button variant="action" onClick={() => setOpened({ kind: "form", role: null })}>
            Créer un rôle
          </Button>
        </div>
        <div
          aria-busy={roles.isFetching || undefined}
          className="flex min-w-0 flex-col gap-4 rounded-card bg-surface p-2 md:p-4"
        >
          {!list ? (
            <TableRowsSkeleton />
          ) : list.length === 0 ? (
            <p role="status" className="px-4 py-12 text-center text-[15px] text-muted-ink">
              Aucun rôle. Créez-en un pour pouvoir créer des administrateurs.
            </p>
          ) : (
            <Table className="min-w-[32rem] text-[15px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Administrateurs</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="py-3 font-semibold">{role.name}</TableCell>
                    <TableCell>{role.adminCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => setOpened({ kind: "form", role })}
                          aria-label={`Renommer ${role.name}`}
                        >
                          Renommer
                        </Button>
                        {/* A role in use cannot be deleted (ROLE_IN_USE). */}
                        {role.adminCount === 0 && (
                          <Button
                            variant="destructive"
                            onClick={() => setOpened({ kind: "delete", role })}
                            aria-label={`Supprimer ${role.name}`}
                          >
                            Supprimer
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      {list && list.length > 0 && (
        <section aria-labelledby="permissions-grid-title" className="flex min-w-0 flex-col gap-4">
          <h2 id="permissions-grid-title" className="font-display text-[22px] font-bold">
            Permissions par rôle
          </h2>
          {permissionList ? (
            <PermissionsGrid roles={list} permissions={permissionList} />
          ) : (
            <div className="rounded-card bg-surface p-2 md:p-4">
              <TableRowsSkeleton />
            </div>
          )}
        </section>
      )}

      {opened?.kind === "form" && (
        <RoleFormDialog key={opened.role?.id ?? "new"} role={opened.role} onClose={() => setOpened(null)} />
      )}
      {opened?.kind === "delete" && (
        <RoleDeleteDialog key={opened.role.id} role={opened.role} onClose={() => setOpened(null)} />
      )}
    </div>
  );
}

function TableRowsSkeleton() {
  return (
    <div role="status" aria-label="Chargement" className="flex flex-col gap-2 p-2">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-14 rounded-control" />
      ))}
    </div>
  );
}

export function RolesSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-11 w-40 self-end rounded-control" />
      <div className="rounded-card bg-surface p-2 md:p-4">
        <TableRowsSkeleton />
      </div>
    </div>
  );
}

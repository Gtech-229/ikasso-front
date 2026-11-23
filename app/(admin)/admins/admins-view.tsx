"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Forbidden } from "@/components/forbidden";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminsQueryKey, fetchAdmins, type AdminSummary } from "@/lib/api/admins";
import { ROLE_LABELS } from "@/lib/api/admin-auth";
import { isApiError, isForbidden, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import { requestPasswordLink } from "@/lib/api/password";
import { fetchRoles, rolesQueryKey, type Role } from "@/lib/api/roles";
import { formatDate } from "@/lib/format";
import { AdminFormDialog } from "./admin-form-dialog";
import { AdminRoleDialog } from "./admin-role-dialog";
import { AdminStatusDialog } from "./admin-status-dialog";

export const ADMINS_HEADING_ID = "admins-list";

const COLUMNS = ["Administrateur", "Rôle", "Statut", "Mot de passe", "Créé le"];

type Opened =
  | { kind: "create" }
  | { kind: "edit"; admin: AdminSummary }
  | { kind: "role"; admin: AdminSummary }
  | { kind: "status"; admin: AdminSummary }
  | null;

export function focusAdminsList() {
  document.getElementById(ADMINS_HEADING_ID)?.focus();
}

export function AdminsView() {
  const admins = useQuery({ queryKey: adminsQueryKey, queryFn: fetchAdmins, meta: { inlineError: true } });
  const roles = useQuery({ queryKey: rolesQueryKey, queryFn: fetchRoles, meta: { inlineError: true } });
  const [opened, setOpened] = useState<Opened>(null);

  const failed = admins.isError ? admins : roles.isError ? roles : null;
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

  const list = admins.data;
  const roleList = roles.data;
  const noRole = roleList !== undefined && roleList.length === 0;
  const roleName = (admin: AdminSummary) =>
    admin.roleId === null
      ? ROLE_LABELS.SUPER_ADMIN
      : (roleList?.find((role) => role.id === admin.roleId)?.name ?? "Rôle inconnu");

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-[15px] text-muted-ink">
          {noRole
            ? "Créez d’abord un rôle dans Rôles et permissions."
            : "Chaque administrateur choisit son mot de passe depuis le lien reçu par email (valable 3 jours)."}
        </p>
        <Button variant="action" disabled={!roleList || noRole} onClick={() => setOpened({ kind: "create" })}>
          Créer un administrateur
        </Button>
      </div>

      <section
        aria-labelledby={ADMINS_HEADING_ID}
        aria-busy={admins.isFetching || undefined}
        className="flex min-w-0 flex-col gap-4 rounded-card bg-surface p-2 md:p-4"
      >
        {/* Focus lands here after a change replaces the clicked button. */}
        <h2 id={ADMINS_HEADING_ID} tabIndex={-1} className="sr-only">
          Liste des administrateurs
        </h2>
        {!list || !roleList ? (
          <TableRowsSkeleton />
        ) : (
          <Table className="min-w-[56rem] text-[15px]">
            <TableHeader>
              <TableRow>
                {COLUMNS.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((admin) => (
                <AdminRow key={admin.id} admin={admin} roleName={roleName(admin)} onOpen={setOpened} />
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {opened?.kind === "create" && roleList && (
        <AdminFormDialog admin={null} roles={roleList} onClose={() => setOpened(null)} />
      )}
      {opened?.kind === "edit" && (
        <AdminFormDialog key={opened.admin.id} admin={opened.admin} roles={roleList ?? []} onClose={() => setOpened(null)} />
      )}
      {opened?.kind === "role" && roleList && (
        <AdminRoleDialog key={opened.admin.id} admin={opened.admin} roles={roleList} onClose={() => setOpened(null)} />
      )}
      {opened?.kind === "status" && (
        <AdminStatusDialog key={opened.admin.id} admin={opened.admin} onClose={() => setOpened(null)} />
      )}
    </div>
  );
}

function AdminRow({
  admin,
  roleName,
  onOpen,
}: {
  admin: AdminSummary;
  roleName: string;
  onOpen: (opened: Opened) => void;
}) {
  const name = `${admin.firstName} ${admin.lastName}`;
  // The API refuses every action on a super admin, including the current one.
  const manageable = admin.role === "ADMIN";
  return (
    <TableRow>
      <TableCell className="py-3">
        <p className="font-semibold">{name}</p>
        <p className="text-[13px] text-muted-ink">{admin.email}</p>
      </TableCell>
      <TableCell>{roleName}</TableCell>
      <TableCell>
        {admin.isActive ? (
          <StatusPill tone="success">Actif</StatusPill>
        ) : (
          <StatusPill tone="muted">Désactivé</StatusPill>
        )}
      </TableCell>
      <TableCell>{admin.hasPassword ? "Défini" : "Lien à envoyer"}</TableCell>
      <TableCell>{formatDate(admin.createdAt)}</TableCell>
      <TableCell className="text-right">
        {manageable && (
          <div className="flex flex-wrap justify-end gap-2">
            {admin.isActive && !admin.hasPassword && <SendLinkButton admin={admin} name={name} />}
            <Button variant="secondary" onClick={() => onOpen({ kind: "edit", admin })} aria-label={`Modifier ${name}`}>
              Modifier
            </Button>
            <Button
              variant="secondary"
              onClick={() => onOpen({ kind: "role", admin })}
              aria-label={`Changer le rôle de ${name}`}
            >
              Changer le rôle
            </Button>
            <Button
              variant={admin.isActive ? "secondary" : "action"}
              onClick={() => onOpen({ kind: "status", admin })}
              aria-label={`${admin.isActive ? "Désactiver" : "Réactiver"} ${name}`}
            >
              {admin.isActive ? "Désactiver" : "Réactiver"}
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

/** Emails the link to choose a first password (the API's message never says whether it left). */
function SendLinkButton({ admin, name }: { admin: AdminSummary; name: string }) {
  const mutation = useMutation({
    mutationFn: () => requestPasswordLink("set", admin.email),
    onSuccess: (message) => toast.success(message),
    onError: (error) => toast.error(isApiError(error) ? error.message : UNEXPECTED_ERROR_MESSAGE),
  });
  return (
    <Button
      variant="action"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
      aria-label={`Envoyer le lien de mot de passe à ${name}`}
    >
      {mutation.isPending ? "Envoi…" : "Envoyer le lien"}
    </Button>
  );
}

export function roleOptions(roles: Role[]) {
  return [...roles].sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

function TableRowsSkeleton() {
  return (
    <div role="status" aria-label="Chargement des administrateurs" className="flex flex-col gap-2 p-2">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-14 rounded-control" />
      ))}
    </div>
  );
}

export function AdminsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-11 w-56 self-end rounded-control" />
      <div className="rounded-card bg-surface p-2 md:p-4">
        <TableRowsSkeleton />
      </div>
    </div>
  );
}

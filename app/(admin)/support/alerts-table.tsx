"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Forbidden } from "@/components/forbidden";
import { StatusPill } from "@/components/status-pill";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ALERT_TYPE_LABELS,
  ALERTS_PAGE_SIZE,
  alertsQueryKey,
  fetchAlerts,
  type Alert,
  type AlertsListParams,
} from "@/lib/api/alerts";
import { isApiError, isForbidden, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import { can } from "@/lib/auth/permissions";
import { useCurrentAdmin } from "@/lib/auth/use-current-admin";
import { formatDate, formatDateTime } from "@/lib/format";
import { alertsListHref } from "@/lib/support-params";
import { ShallowLink } from "../stores/shallow-link";
import { Pagination, TableSkeleton } from "../stores/stores-table";
import { ResolveAlertDialog } from "./resolve-alert-dialog";

export const ALERTS_HEADING_ID = "support-alerts-list";

const integerFormat = new Intl.NumberFormat("fr-FR");

/** The gap in the smallest currency unit, signed ("+1 500", "−300"); BigInt, never Number. */
const ZERO = BigInt(0);

function formatDifference(difference: string): string {
  const value = BigInt(difference);
  const sign = value > ZERO ? "+" : value < ZERO ? "−" : "";
  return `${sign}${integerFormat.format(value < ZERO ? -value : value)}`;
}

export function AlertsTable({ params }: { params: AlertsListParams }) {
  const query = useQuery({
    queryKey: alertsQueryKey(params),
    queryFn: () => fetchAlerts(params),
    placeholderData: keepPreviousData,
    meta: { inlineError: true },
  });
  const admin = useCurrentAdmin().data;
  const canResolve = !!admin && can(admin, "alerts.manage");
  const linkStores = !!admin && can(admin, "stores.read");
  const [resolving, setResolving] = useState<Alert | null>(null);

  if (query.isError) {
    if (isForbidden(query.error)) return <Forbidden embedded />;
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-card bg-surface p-6">
        <p className="text-[15px] text-danger">
          {isApiError(query.error) ? query.error.message : UNEXPECTED_ERROR_MESSAGE}
        </p>
        <Button variant="secondary" onClick={() => query.refetch()}>
          Réessayer
        </Button>
      </div>
    );
  }

  const data = query.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / ALERTS_PAGE_SIZE)) : 1;

  return (
    <section
      aria-labelledby={ALERTS_HEADING_ID}
      aria-busy={query.isFetching || undefined}
      className="flex min-w-0 flex-col gap-4 rounded-card bg-surface p-2 md:p-4"
    >
      {/* Focus lands here after a resolve removes the clicked button. */}
      <h3 id={ALERTS_HEADING_ID} tabIndex={-1} className="sr-only">
        Liste des alertes
      </h3>
      {!data ? (
        <TableSkeleton />
      ) : data.items.length === 0 ? (
        <EmptyState params={params} total={data.total} />
      ) : (
        <div className={query.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
          <Table className="min-w-[64rem] text-[15px]">
            <TableHeader>
              <TableRow>
                <TableHead>Détectée le</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Concerne</TableHead>
                <TableHead>
                  Écart <span className="font-normal text-muted-ink">(en plus petite unité de la devise)</span>
                </TableHead>
                <TableHead>État</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Action</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell className="py-3 whitespace-nowrap">{formatDateTime(alert.createdAt)}</TableCell>
                  <TableCell className="font-semibold">{ALERT_TYPE_LABELS[alert.type]}</TableCell>
                  <TableCell>
                    <Concerns alert={alert} linkStores={linkStores} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {alert.difference === null ? "—" : formatDifference(alert.difference)}
                  </TableCell>
                  <TableCell>
                    {alert.resolvedAt ? (
                      <div className="flex flex-col items-start gap-1">
                        <StatusPill tone="success">Traitée</StatusPill>
                        <span className="text-[13px] text-muted-ink">
                          {alert.resolvedBy
                            ? `par ${alert.resolvedBy.firstName} ${alert.resolvedBy.lastName}, `
                            : ""}
                          le {formatDate(alert.resolvedAt)}
                        </span>
                      </div>
                    ) : (
                      <StatusPill tone="pending">À traiter</StatusPill>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {canResolve && !alert.resolvedAt && (
                      <Button variant="secondary" onClick={() => setResolving(alert)}>
                        Marquer comme traitée
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {data && data.items.length > 0 && (
        <Pagination
          page={params.page}
          totalPages={totalPages}
          summary={`${data.total} alerte${data.total > 1 ? "s" : ""}`}
          hrefFor={(page) => alertsListHref({ ...params, page })}
        />
      )}
      {resolving && (
        <ResolveAlertDialog key={resolving.id} alert={resolving} onClose={() => setResolving(null)} />
      )}
    </section>
  );
}

/** What the alert is about, as far as the API names it. */
function Concerns({ alert, linkStores }: { alert: Alert; linkStores: boolean }) {
  const change = alert.whatsappChange;
  const lines: React.ReactNode[] = [];
  if (alert.store) {
    lines.push(
      linkStores ? (
        <Link href={`/stores/${alert.store.id}`} className="font-semibold underline-offset-4 hover:underline">
          {alert.store.name}
        </Link>
      ) : (
        <span className="font-semibold">{alert.store.name}</span>
      ),
    );
  }
  if (alert.account) lines.push(`Compte ${alert.account.number}`);
  if (alert.goal) lines.push(`Objectif « ${alert.goal.label} »`);
  if (alert.order) lines.push(`Bon ${alert.order.reference}`);
  if (change) {
    lines.push(
      `Par ${change.changedBy.firstName} ${change.changedBy.lastName}, le ${formatDateTime(change.changedAt)}`,
    );
    lines.push(`WhatsApp ${change.enabledBefore ? "activé" : "désactivé"} → ${change.enabledAfter ? "activé" : "désactivé"}`);
    if (change.instanceIdChanged) lines.push("Instance modifiée");
    if (change.tokenChanged) lines.push("Jeton remplacé");
  }
  if (lines.length === 0) return <span className="text-muted-ink">Plateforme</span>;
  return (
    <ul className="flex flex-col gap-0.5">
      {lines.map((line, index) => (
        <li key={index} className={index === 0 ? undefined : "text-[13px] text-muted-ink"}>
          {line}
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ params, total }: { params: AlertsListParams; total: number }) {
  let message = params.state === "open" && !params.type ? "Aucune alerte à traiter." : "Aucune alerte dans cet onglet.";
  let action: { href: string; label: string } | undefined;
  if (total > 0) {
    message = "Cette page n’existe plus.";
    action = { href: alertsListHref({ ...params, page: 1 }), label: "Revenir à la première page" };
  }
  return (
    <div role="status" className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <p className="text-[15px] text-muted-ink">{message}</p>
      {action && (
        <ShallowLink href={action.href} className={buttonVariants({ variant: "secondary" })}>
          {action.label}
        </ShallowLink>
      )}
    </div>
  );
}

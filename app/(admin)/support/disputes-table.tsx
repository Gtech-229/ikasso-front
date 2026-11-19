"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Forbidden } from "@/components/forbidden";
import { StatusPill } from "@/components/status-pill";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DISPUTE_STATUS_LABELS,
  DISPUTES_PAGE_SIZE,
  disputesQueryKey,
  fetchDisputes,
  OPERATION_TYPE_LABELS,
  type Dispute,
  type DisputesListParams,
} from "@/lib/api/disputes";
import { isApiError, isForbidden, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import { can } from "@/lib/auth/permissions";
import { useCurrentAdmin } from "@/lib/auth/use-current-admin";
import { disputesListHref } from "@/lib/disputes-list-params";
import { formatDate } from "@/lib/format";
import { ShallowLink } from "../stores/shallow-link";
import { Pagination, TableSkeleton } from "../stores/stores-table";
import { DISPUTE_STATUS_TONES, DisputeDialog } from "./dispute-dialog";
import { useDisputeAmount } from "./dispute-amount";

const COLUMNS = ["Ouverte le", "Quincaillerie", "Client", "Opération", "État", "Messages", "Action"];

export function DisputesTable({ params }: { params: DisputesListParams }) {
  const query = useQuery({
    queryKey: disputesQueryKey(params),
    queryFn: () => fetchDisputes(params),
    placeholderData: keepPreviousData,
    meta: { inlineError: true },
  });
  const [opened, setOpened] = useState<Dispute | null>(null);
  const amount = useDisputeAmount();
  const admin = useCurrentAdmin().data;
  const linkStores = !!admin && can(admin, "stores.read");

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
  const totalPages = data ? Math.max(1, Math.ceil(data.total / DISPUTES_PAGE_SIZE)) : 1;

  return (
    <section
      aria-label="Liste des contestations"
      aria-busy={query.isFetching || undefined}
      className="flex min-w-0 flex-col gap-4 rounded-card bg-surface p-2 md:p-4"
    >
      {!data ? (
        <TableSkeleton />
      ) : data.items.length === 0 ? (
        <EmptyState params={params} total={data.total} />
      ) : (
        <div className={query.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
          <Table className="min-w-[60rem] text-[15px]">
            <TableHeader>
              <TableRow>
                {COLUMNS.map((column) => (
                  <TableHead key={column} className={column === "Action" ? "text-right" : undefined}>
                    {column === "Action" ? <span className="sr-only">Action</span> : column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((dispute) => (
                <TableRow key={dispute.id}>
                  <TableCell className="py-3">{formatDate(dispute.createdAt)}</TableCell>
                  <TableCell>
                    {linkStores ? (
                      <Link
                        href={`/stores/${dispute.store.id}`}
                        className="font-semibold underline-offset-4 hover:underline"
                      >
                        {dispute.store.name}
                      </Link>
                    ) : (
                      <span className="font-semibold">{dispute.store.name}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <p>
                      {dispute.customer.firstName} {dispute.customer.lastName}
                    </p>
                    <p className="text-[13px] text-muted-ink">Compte {dispute.account.number}</p>
                  </TableCell>
                  <TableCell>
                    <p>
                      {OPERATION_TYPE_LABELS[dispute.operation.type]} · {amount(dispute.operation)}
                    </p>
                    <p className="text-[13px] text-muted-ink">{dispute.operation.reference}</p>
                  </TableCell>
                  <TableCell>
                    <StatusPill tone={DISPUTE_STATUS_TONES[dispute.status]}>
                      {DISPUTE_STATUS_LABELS[dispute.status]}
                    </StatusPill>
                  </TableCell>
                  <TableCell>{dispute.messages.length}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="secondary"
                      onClick={() => setOpened(dispute)}
                      aria-label={`Lire la contestation de ${dispute.customer.firstName} ${dispute.customer.lastName}, ${dispute.store.name}`}
                    >
                      Lire
                    </Button>
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
          summary={`${data.total} contestation${data.total > 1 ? "s" : ""}`}
          hrefFor={(page) => disputesListHref({ ...params, page })}
        />
      )}
      {opened && (
        <DisputeDialog key={opened.id} dispute={opened} amount={amount} onClose={() => setOpened(null)} />
      )}
    </section>
  );
}

function EmptyState({ params, total }: { params: DisputesListParams; total: number }) {
  let message = "Aucune contestation en cours.";
  let action: { href: string; label: string } | undefined;
  if (total > 0) {
    message = "Cette page n’existe plus.";
    action = { href: disputesListHref({ ...params, page: 1 }), label: "Revenir à la première page" };
  } else if (params.status) {
    message = "Aucune contestation dans cet onglet.";
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

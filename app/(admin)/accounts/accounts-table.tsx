"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Forbidden } from "@/components/forbidden";
import { StatusPill } from "@/components/status-pill";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { accountsListHref } from "@/lib/accounts-list-params";
import {
  ACCOUNT_STATUS_LABELS,
  ACCOUNTS_PAGE_SIZE,
  accountsQueryKey,
  fetchAccounts,
  type Account,
  type AccountsListParams,
} from "@/lib/api/accounts";
import { isApiError, isForbidden, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import { can } from "@/lib/auth/permissions";
import { useCurrentAdmin } from "@/lib/auth/use-current-admin";
import { formatDate } from "@/lib/format";
import { ShallowLink } from "../stores/shallow-link";
import { Pagination, TableSkeleton } from "../stores/stores-table";
import { AccountStatusDialog } from "./account-status-dialog";

export const ACCOUNTS_HEADING_ID = "accounts-list";

const COLUMNS = ["N° de compte", "Client", "Quincaillerie", "Ouvert le", "État"];

export function AccountsTable({ params }: { params: AccountsListParams }) {
  const query = useQuery({
    queryKey: accountsQueryKey(params),
    queryFn: () => fetchAccounts(params),
    placeholderData: keepPreviousData,
    meta: { inlineError: true },
  });
  const admin = useCurrentAdmin().data;
  const canManage = !!admin && can(admin, "accounts.manage");
  const linkStores = !!admin && can(admin, "stores.read");
  const [acting, setActing] = useState<Account | null>(null);

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
  const totalPages = data ? Math.max(1, Math.ceil(data.total / ACCOUNTS_PAGE_SIZE)) : 1;

  return (
    <section
      aria-labelledby={ACCOUNTS_HEADING_ID}
      aria-busy={query.isFetching || undefined}
      className="flex min-w-0 flex-col gap-4 rounded-card bg-surface p-2 md:p-4"
    >
      {/* Focus lands here after a status change replaces the clicked button. */}
      <h2 id={ACCOUNTS_HEADING_ID} tabIndex={-1} className="sr-only">
        Liste des comptes
      </h2>
      {!data ? (
        <TableSkeleton />
      ) : data.items.length === 0 ? (
        <EmptyState params={params} total={data.total} />
      ) : (
        <div className={query.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
          <Table className="min-w-[56rem] text-[15px]">
            <TableHeader>
              <TableRow>
                {COLUMNS.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
                <TableHead className="text-right">
                  <span className="sr-only">Action</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="py-3 font-semibold whitespace-nowrap">{account.number}</TableCell>
                  <TableCell>
                    <p>
                      {account.customer.firstName} {account.customer.lastName}
                    </p>
                    <p className="text-[13px] text-muted-ink">{account.customer.phone}</p>
                  </TableCell>
                  <TableCell>
                    {linkStores ? (
                      <Link href={`/stores/${account.store.id}`} className="underline-offset-4 hover:underline">
                        {account.store.name}
                      </Link>
                    ) : (
                      account.store.name
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(account.createdAt)}</TableCell>
                  <TableCell>
                    <Status account={account} />
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage && (
                      <Button
                        variant={account.status === "ACTIVE" ? "secondary" : "action"}
                        onClick={() => setActing(account)}
                        aria-label={`${account.status === "ACTIVE" ? "Suspendre" : "Réactiver"} le compte ${account.number}`}
                      >
                        {account.status === "ACTIVE" ? "Suspendre" : "Réactiver"}
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
          summary={`${data.total} compte${data.total > 1 ? "s" : ""}`}
          hrefFor={(page) => accountsListHref({ ...params, page })}
        />
      )}
      {acting && <AccountStatusDialog key={acting.id} account={acting} onClose={() => setActing(null)} />}
    </section>
  );
}

function Status({ account }: { account: Account }) {
  if (account.status === "ACTIVE") return <StatusPill tone="success">{ACCOUNT_STATUS_LABELS.ACTIVE}</StatusPill>;
  return (
    <div className="flex max-w-xs flex-col items-start gap-1">
      <StatusPill tone="danger">{ACCOUNT_STATUS_LABELS.SUSPENDED}</StatusPill>
      {account.statusChangedAt && (
        <span className="text-[13px] text-muted-ink">depuis le {formatDate(account.statusChangedAt)}</span>
      )}
      {/* Staff-visible reason: plain text. */}
      {account.statusReason && <span className="text-[13px] break-words">{account.statusReason}</span>}
    </div>
  );
}

function EmptyState({ params, total }: { params: AccountsListParams; total: number }) {
  let message = "Aucun compte pour le moment.";
  let action: { href: string; label: string } | undefined;
  if (total > 0) {
    message = "Cette page n’existe plus.";
    action = { href: accountsListHref({ ...params, page: 1 }), label: "Revenir à la première page" };
  } else if (params.q) {
    message = `Aucun compte ne correspond à « ${params.q} ».`;
    action = { href: accountsListHref({ status: params.status, page: 1 }), label: "Effacer la recherche" };
  } else if (params.status) {
    message = "Aucun compte dans cet onglet.";
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

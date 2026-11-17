"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Forbidden } from "@/components/forbidden";
import { StatusPill, type PillTone } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isApiError, isForbidden, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import {
  fetchStores,
  STORE_STATUS_LABELS,
  STORES_PAGE_SIZE,
  storesQueryKey,
  SUBSCRIPTION_STATE_LABELS,
  type StoreStatus,
  type StoreSummary,
  type StoresListParams,
  type SubscriptionState,
} from "@/lib/api/stores";
import { formatDate } from "@/lib/format";
import { storesListHref } from "@/lib/stores-list-params";
import { ShallowLink } from "./shallow-link";

const STATUS_TONES: Record<StoreStatus, PillTone> = {
  PENDING: "pending",
  VERIFIED: "success",
  SUSPENDED: "danger",
  CLOSED: "muted",
};

const SUBSCRIPTION_TONES: Record<SubscriptionState, PillTone> = {
  ACTIVE: "success",
  UPCOMING: "pending",
  EXPIRED: "dark",
  NONE: "muted",
};

const COLUMNS = ["Quincaillerie", "Ville", "Pays", "Statut", "Abonnement", "Inscrite le", "Action"];

export function StoresTable({ params }: { params: StoresListParams }) {
  const query = useQuery({
    queryKey: storesQueryKey(params),
    queryFn: () => fetchStores(params),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  });

  if (query.isError) {
    if (isForbidden(query.error)) return <Forbidden />;
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
  const totalPages = data ? Math.max(1, Math.ceil(data.total / STORES_PAGE_SIZE)) : 1;

  return (
    <section
      aria-label="Liste des quincailleries"
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
              {data.items.map((store) => (
                <StoreRow key={store.id} store={store} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {data && data.items.length > 0 && (
        <Pagination params={params} total={data.total} totalPages={totalPages} />
      )}
    </section>
  );
}

function StoreRow({ store }: { store: StoreSummary }) {
  const pending = store.status === "PENDING";
  return (
    <TableRow>
      <TableCell className="py-3">
        <p className="font-semibold">{store.name}</p>
        <p className="text-[13px] text-muted-ink">{store.phone}</p>
      </TableCell>
      <TableCell>{store.city}</TableCell>
      <TableCell>{store.countryCode}</TableCell>
      <TableCell>
        <StatusPill tone={STATUS_TONES[store.status]}>{STORE_STATUS_LABELS[store.status]}</StatusPill>
      </TableCell>
      <TableCell>
        <div className="flex flex-col items-start gap-1">
          <StatusPill tone={SUBSCRIPTION_TONES[store.subscriptionState]}>
            {SUBSCRIPTION_STATE_LABELS[store.subscriptionState]}
          </StatusPill>
          {store.currentSubscription && (
            <span className="text-[13px] text-muted-ink">
              jusqu’au {formatDate(store.currentSubscription.endsOn)}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>{formatDate(store.createdAt)}</TableCell>
      <TableCell className="text-right">
        <Button
          variant={pending ? "action" : "secondary"}
          render={<Link href={pending ? `/stores/${store.id}/verification` : `/stores/${store.id}`} />}
          nativeButton={false}
          aria-label={`${pending ? "Examiner" : "Ouvrir"} ${store.name}`}
        >
          {pending ? "Examiner" : "Ouvrir"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

function EmptyState({ params, total }: { params: StoresListParams; total: number }) {
  let message = "Aucune quincaillerie pour le moment.";
  let action: { href: string; label: string } | undefined;
  if (total > 0) {
    message = "Cette page n’existe plus.";
    action = { href: storesListHref({ ...params, page: 1 }), label: "Revenir à la première page" };
  } else if (params.q) {
    message = `Aucune quincaillerie ne correspond à « ${params.q} ».`;
    action = { href: storesListHref({ status: params.status, page: 1 }), label: "Effacer la recherche" };
  } else if (params.status) {
    message = "Aucune quincaillerie dans cet onglet.";
  }
  return (
    <div role="status" className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <p className="text-[15px] text-muted-ink">{message}</p>
      {action && (
        <Button variant="secondary" render={<ShallowLink href={action.href} />} nativeButton={false}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

function Pagination({
  params,
  total,
  totalPages,
}: {
  params: StoresListParams;
  total: number;
  totalPages: number;
}) {
  const previous = params.page > 1 ? storesListHref({ ...params, page: params.page - 1 }) : null;
  const next = params.page < totalPages ? storesListHref({ ...params, page: params.page + 1 }) : null;
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 px-2">
      <p className="text-[14px] text-muted-ink">
        Page {params.page} sur {totalPages} · {total} quincaillerie{total > 1 ? "s" : ""}
      </p>
      <div className="flex gap-2">
        <PageLink href={previous} label="Précédente" />
        <PageLink href={next} label="Suivante" />
      </div>
    </nav>
  );
}

function PageLink({ href, label }: { href: string | null; label: string }) {
  if (!href) {
    return (
      <Button variant="secondary" disabled>
        {label}
      </Button>
    );
  }
  return (
    <Button variant="secondary" render={<ShallowLink href={href} />} nativeButton={false}>
      {label}
    </Button>
  );
}

function TableSkeleton() {
  return (
    <div role="status" aria-label="Chargement de la liste" className="flex flex-col gap-2 p-2">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-14 rounded-control" />
      ))}
    </div>
  );
}

"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Forbidden } from "@/components/forbidden";
import { StatusPill, STORE_STATUS_TONES, SUBSCRIPTION_STATE_TONES } from "@/components/status-pill";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isApiError, isForbidden, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import {
  fetchStores,
  PLAN_LABELS,
  STORE_STATUS_LABELS,
  STORES_PAGE_SIZE,
  storesQueryKey,
  SUBSCRIPTION_STATE_LABELS,
  type StoreSummary,
} from "@/lib/api/stores";
import { formatDate } from "@/lib/format";
import { subscriptionsListHref, type SubscriptionsListParams } from "@/lib/subscriptions-list-params";
import { ShallowLink } from "../stores/shallow-link";
import { Pagination, TableSkeleton } from "../stores/stores-table";
import { SubscriptionsDialog } from "./subscriptions-dialog";

const COLUMNS = ["Quincaillerie", "Ville", "Statut", "Abonnement", "Formule", "Période", "Action"];

export function SubscriptionsTable({ params }: { params: SubscriptionsListParams }) {
  const query = useQuery({
    queryKey: storesQueryKey(params),
    queryFn: () => fetchStores(params),
    placeholderData: keepPreviousData,
  });
  // The store whose subscriptions dialog is open.
  const [opened, setOpened] = useState<StoreSummary | null>(null);

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
  const totalPages = data ? Math.max(1, Math.ceil(data.total / STORES_PAGE_SIZE)) : 1;

  return (
    <section
      aria-label="Abonnements des quincailleries"
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
                <SubscriptionRow key={store.id} store={store} onOpen={() => setOpened(store)} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {data && data.items.length > 0 && (
        <Pagination
          page={params.page}
          totalPages={totalPages}
          summary={`${data.total} quincaillerie${data.total > 1 ? "s" : ""}`}
          hrefFor={(page) => subscriptionsListHref({ ...params, page })}
        />
      )}
      {opened && (
        // Remounted per store: no history or form state carried over.
        <SubscriptionsDialog key={opened.id} store={opened} onClose={() => setOpened(null)} />
      )}
    </section>
  );
}

function SubscriptionRow({ store, onOpen }: { store: StoreSummary; onOpen: () => void }) {
  const current = store.currentSubscription;
  return (
    <TableRow>
      <TableCell className="py-3">
        <Link href={`/stores/${store.id}`} className="font-semibold underline-offset-4 hover:underline">
          {store.name}
        </Link>
      </TableCell>
      <TableCell>{store.city}</TableCell>
      <TableCell>
        <StatusPill tone={STORE_STATUS_TONES[store.status]}>{STORE_STATUS_LABELS[store.status]}</StatusPill>
      </TableCell>
      <TableCell>
        <StatusPill tone={SUBSCRIPTION_STATE_TONES[store.subscriptionState]}>
          {SUBSCRIPTION_STATE_LABELS[store.subscriptionState]}
        </StatusPill>
      </TableCell>
      <TableCell>{current ? PLAN_LABELS[current.plan] : "—"}</TableCell>
      <TableCell>
        {current ? `du ${formatDate(current.startsOn)} au ${formatDate(current.endsOn)}` : "—"}
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="secondary"
          onClick={onOpen}
          aria-label={`Ouvrir les abonnements de ${store.name}`}
        >
          Ouvrir
        </Button>
      </TableCell>
    </TableRow>
  );
}

function EmptyState({ params, total }: { params: SubscriptionsListParams; total: number }) {
  let message = "Aucune quincaillerie pour le moment.";
  let action: { href: string; label: string } | undefined;
  if (total > 0) {
    message = "Cette page n’existe plus.";
    action = { href: subscriptionsListHref({ ...params, page: 1 }), label: "Revenir à la première page" };
  } else if (params.q) {
    message = `Aucune quincaillerie ne correspond à « ${params.q} ».`;
    action = {
      href: subscriptionsListHref({ subscriptionState: params.subscriptionState, page: 1 }),
      label: "Effacer la recherche",
    };
  } else if (params.subscriptionState) {
    message = "Aucune quincaillerie dans cet onglet.";
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

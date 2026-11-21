"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRef, useState } from "react";
import { Forbidden } from "@/components/forbidden";
import { StatusPill, STORE_STATUS_TONES, SUBSCRIPTION_STATE_TONES } from "@/components/status-pill";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  type StoreSummary,
  type StoresListParams,
} from "@/lib/api/stores";
import { can } from "@/lib/auth/permissions";
import { useCurrentAdmin } from "@/lib/auth/use-current-admin";
import { formatDate } from "@/lib/format";
import { storesListHref } from "@/lib/stores-list-params";
import { BulkActionBar } from "./bulk-actions";
import { ShallowLink } from "./shallow-link";

const COLUMNS = ["Quincaillerie", "Ville", "Pays", "Statut", "Abonnement", "Inscrite le", "Action"];

export function StoresTable({ params }: { params: StoresListParams }) {
  const query = useQuery({
    queryKey: storesQueryKey(params),
    queryFn: () => fetchStores(params),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  });
  // Group actions (feature 21) need stores.manage, the API's guard.
  const admin = useCurrentAdmin().data;
  const selectable = admin ? can(admin, "stores.manage") : false;
  // The selection belongs to one page of one filter: another page, tab or
  // search starts empty (the key no longer matches).
  const pageKey = JSON.stringify(params);
  const [selection, setSelection] = useState<{ key: string; ids: ReadonlySet<string> }>({
    key: pageKey,
    ids: new Set(),
  });
  const sectionRef = useRef<HTMLElement>(null);
  const selectedIds = selection.key === pageKey ? selection.ids : new Set<string>();
  const setSelected = (ids: ReadonlySet<string>) => setSelection({ key: pageKey, ids });

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
  // Closed stores take no action; a store that left the page drops out.
  const selectableRows = data ? data.items.filter((store) => store.status !== "CLOSED") : [];
  const selected = selectableRows.filter((store) => selectedIds.has(store.id));
  const allChecked = selectableRows.length > 0 && selected.length === selectableRows.length;

  function toggle(id: string, checked: boolean) {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  }

  return (
    <section
      ref={sectionRef}
      tabIndex={-1}
      aria-label="Liste des quincailleries"
      aria-busy={query.isFetching || undefined}
      className="flex min-w-0 flex-col gap-4 rounded-card bg-surface p-2 outline-none md:p-4"
    >
      {selectable && (
        <BulkActionBar
          selected={selected}
          onClear={() => setSelected(new Set())}
          onDone={() => {
            setSelected(new Set());
            sectionRef.current?.focus();
          }}
        />
      )}
      {!data ? (
        <TableSkeleton />
      ) : data.items.length === 0 ? (
        <EmptyState params={params} total={data.total} />
      ) : (
        <div className={query.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
          <Table className="min-w-[60rem] text-[15px]">
            <TableHeader>
              <TableRow>
                {selectable && (
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="Sélectionner la page"
                      checked={allChecked}
                      indeterminate={selected.length > 0 && !allChecked}
                      disabled={selectableRows.length === 0}
                      onCheckedChange={(checked) =>
                        setSelected(new Set(checked ? selectableRows.map((store) => store.id) : []))
                      }
                    />
                  </TableHead>
                )}
                {COLUMNS.map((column) => (
                  <TableHead key={column} className={column === "Action" ? "text-right" : undefined}>
                    {column === "Action" ? <span className="sr-only">Action</span> : column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((store) => (
                <StoreRow
                  key={store.id}
                  store={store}
                  selection={
                    selectable
                      ? { checked: selectedIds.has(store.id), onChange: (checked) => toggle(store.id, checked) }
                      : undefined
                  }
                />
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
          hrefFor={(page) => storesListHref({ ...params, page })}
        />
      )}
    </section>
  );
}

function StoreRow({
  store,
  selection,
}: {
  store: StoreSummary;
  /** Present only for admins who may run group actions. */
  selection?: { checked: boolean; onChange: (checked: boolean) => void };
}) {
  const pending = store.status === "PENDING";
  return (
    <TableRow>
      {selection && (
        <TableCell>
          <Checkbox
            aria-label={`Sélectionner ${store.name}`}
            checked={selection.checked && store.status !== "CLOSED"}
            disabled={store.status === "CLOSED"}
            onCheckedChange={(checked) => selection.onChange(checked)}
          />
        </TableCell>
      )}
      <TableCell className="py-3">
        <p className="font-semibold">{store.name}</p>
        <p className="text-[13px] text-muted-ink">{store.phone}</p>
      </TableCell>
      <TableCell>{store.city}</TableCell>
      <TableCell>{store.countryCode}</TableCell>
      <TableCell>
        <div className="flex flex-col items-start gap-1">
          <StatusPill tone={STORE_STATUS_TONES[store.status]}>{STORE_STATUS_LABELS[store.status]}</StatusPill>
          {pending && !store.documentsComplete && (
            <span className="text-[13px] text-muted-ink">Dossier incomplet</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col items-start gap-1">
          <StatusPill tone={SUBSCRIPTION_STATE_TONES[store.subscriptionState]}>
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
        <Link
          href={pending ? `/stores/${store.id}/verification` : `/stores/${store.id}`}
          className={buttonVariants({ variant: pending ? "action" : "secondary" })}
          aria-label={`${pending ? "Examiner" : "Ouvrir"} ${store.name}`}
        >
          {pending ? "Examiner" : "Ouvrir"}
        </Link>
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
        <ShallowLink href={action.href} className={buttonVariants({ variant: "secondary" })}>
          {action.label}
        </ShallowLink>
      )}
    </div>
  );
}

/** Previous / next shallow links; `hrefFor` gives a page's list URL. */
export function Pagination({
  page,
  totalPages,
  summary,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  summary: string;
  hrefFor: (page: number) => string;
}) {
  const previous = page > 1 ? hrefFor(page - 1) : null;
  const next = page < totalPages ? hrefFor(page + 1) : null;
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 px-2">
      <p className="text-[14px] text-muted-ink">
        Page {page} sur {totalPages} · {summary}
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
    <ShallowLink href={href} className={buttonVariants({ variant: "secondary" })}>
      {label}
    </ShallowLink>
  );
}

export function TableSkeleton() {
  return (
    <div role="status" aria-label="Chargement de la liste" className="flex flex-col gap-2 p-2">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-14 rounded-control" />
      ))}
    </div>
  );
}

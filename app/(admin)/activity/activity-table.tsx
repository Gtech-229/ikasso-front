"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Forbidden } from "@/components/forbidden";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { activityHref, hasActivityFilters } from "@/lib/activity-params";
import {
  ACTIVITY_ACTION_LABELS,
  ACTIVITY_PAGE_SIZE,
  activityQueryKey,
  fetchActivity,
  formatActivityValue,
  type ActivityEntry,
  type ActivityListParams,
} from "@/lib/api/activity";
import { isApiError, isForbidden, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import { can } from "@/lib/auth/permissions";
import { useCurrentAdmin } from "@/lib/auth/use-current-admin";
import { formatDateTime } from "@/lib/format";
import { ShallowLink } from "../stores/shallow-link";
import { Pagination, TableSkeleton } from "../stores/stores-table";

const COLUMNS = ["Date", "Quincaillerie", "Auteur", "Action", "Détails", "Appareil"];

export function ActivityTable({ params }: { params: ActivityListParams }) {
  const query = useQuery({
    queryKey: activityQueryKey(params),
    queryFn: () => fetchActivity(params),
    placeholderData: keepPreviousData,
    meta: { inlineError: true },
  });
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
  const totalPages = data ? Math.max(1, Math.ceil(data.total / ACTIVITY_PAGE_SIZE)) : 1;

  return (
    <section
      aria-label="Journal d’activité"
      aria-busy={query.isFetching || undefined}
      className="flex min-w-0 flex-col gap-4 rounded-card bg-surface p-2 md:p-4"
    >
      {!data ? (
        <TableSkeleton />
      ) : data.items.length === 0 ? (
        <EmptyState params={params} total={data.total} />
      ) : (
        <div className={query.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
          <Table className="min-w-[64rem] text-[15px]">
            <TableHeader>
              <TableRow>
                {COLUMNS.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((entry) => (
                <TableRow key={entry.id} className="align-top">
                  <TableCell className="py-3 whitespace-nowrap">{formatDateTime(entry.createdAt)}</TableCell>
                  <TableCell>
                    {!entry.store ? (
                      "—"
                    ) : linkStores ? (
                      <Link href={`/stores/${entry.store.id}`} className="underline-offset-4 hover:underline">
                        {entry.store.name}
                      </Link>
                    ) : (
                      entry.store.name
                    )}
                  </TableCell>
                  <TableCell>
                    {entry.author.firstName} {entry.author.lastName}
                  </TableCell>
                  <TableCell className="font-semibold">{ACTIVITY_ACTION_LABELS[entry.action]}</TableCell>
                  <TableCell className="max-w-sm">
                    <Details entry={entry} />
                  </TableCell>
                  <TableCell className="text-[13px] break-all text-muted-ink">{entry.device ?? "—"}</TableCell>
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
          summary={`${data.total} action${data.total > 1 ? "s" : ""}`}
          hrefFor={(page) => activityHref({ ...params, page })}
        />
      )}
    </section>
  );
}

/** Before and after, as plain text lines. */
function Details({ entry }: { entry: ActivityEntry }) {
  const before = formatActivityValue(entry.oldValue);
  const after = formatActivityValue(entry.newValue);
  if (before.length === 0 && after.length === 0) return <span className="text-muted-ink">—</span>;
  return (
    <div className="flex flex-col gap-1 text-[13px] break-words">
      {before.length > 0 && <ValueLines label="Avant" lines={before} />}
      {after.length > 0 && <ValueLines label="Après" lines={after} />}
    </div>
  );
}

function ValueLines({ label, lines }: { label: string; lines: string[] }) {
  return (
    <div>
      <span className="font-semibold">{label}</span>
      <ul>
        {lines.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({ params, total }: { params: ActivityListParams; total: number }) {
  let message = "Aucune action enregistrée pour le moment.";
  let action: { href: string; label: string } | undefined;
  if (total > 0) {
    message = "Cette page n’existe plus.";
    action = { href: activityHref({ ...params, page: 1 }), label: "Revenir à la première page" };
  } else if (hasActivityFilters(params)) {
    message = "Aucune action ne correspond à ces filtres.";
    action = { href: "/activity", label: "Effacer les filtres" };
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

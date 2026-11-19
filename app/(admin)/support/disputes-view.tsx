"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { DISPUTE_STATUS_LABELS, disputeCountQueryKey, fetchDisputeCount, type DisputeStatus } from "@/lib/api/disputes";
import { disputesListHref, parseDisputesListParams } from "@/lib/disputes-list-params";
import { cn } from "@/lib/utils";
import { ShallowLink } from "../stores/shallow-link";
import { DisputesTable } from "./disputes-table";

// "—" until the API answers, never a guessed number.
const shown = (count: number | undefined) => (count === undefined ? "—" : String(count));

const FILTERS: { status?: DisputeStatus; label: string }[] = [
  { label: "Toutes" },
  { status: "OPEN", label: DISPUTE_STATUS_LABELS.OPEN },
  { status: "ANSWERED", label: DISPUTE_STATUS_LABELS.ANSWERED },
];

export function DisputesView() {
  const params = parseDisputesListParams(useSearchParams());
  return (
    <section aria-labelledby="support-disputes" className="flex min-w-0 flex-col gap-4">
      {/* 11b turns this heading into the Contestations / Alertes tabs. */}
      <h2 id="support-disputes" className="font-display text-[22px] font-bold">
        Contestations
      </h2>
      <nav aria-label="Filtrer par état" className="-mx-1 overflow-x-auto px-1">
        <ul className="flex gap-2">
          {FILTERS.map((filter) => (
            <li key={filter.label}>
              <Filter status={filter.status} label={filter.label} active={filter.status === params.status} />
            </li>
          ))}
        </ul>
      </nav>
      <DisputesTable params={params} />
    </section>
  );
}

function Filter({ status, label, active }: { status?: DisputeStatus; label: string; active: boolean }) {
  const count = useQuery({
    queryKey: disputeCountQueryKey(status),
    queryFn: () => fetchDisputeCount(status),
  }).data;
  return (
    <ShallowLink
      href={disputesListHref({ status, page: 1 })}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center rounded-full px-4 text-[15px] font-semibold whitespace-nowrap transition-colors",
        active ? "bg-ink text-surface" : "bg-surface text-ink hover:bg-ink/5",
      )}
    >
      {label} · {shown(count)}
    </ShallowLink>
  );
}

export function DisputesSkeleton() {
  return (
    <div role="status" aria-label="Chargement des contestations" className="flex flex-col gap-4">
      <Skeleton className="h-7 w-48 rounded-control" />
      <Skeleton className="h-11 w-full max-w-xl rounded-full" />
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}

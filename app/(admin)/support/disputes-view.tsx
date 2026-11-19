"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { DISPUTE_STATUS_LABELS, disputeCountQueryKey, fetchDisputeCount, type DisputeStatus } from "@/lib/api/disputes";
import { disputesListHref, parseDisputesListParams } from "@/lib/disputes-list-params";
import { PillLink } from "../stores/pill-link";
import { DisputesTable } from "./disputes-table";

const FILTERS: { status?: DisputeStatus; label: string }[] = [
  { label: "Toutes" },
  { status: "OPEN", label: DISPUTE_STATUS_LABELS.OPEN },
  { status: "ANSWERED", label: DISPUTE_STATUS_LABELS.ANSWERED },
];

export function DisputesView() {
  const params = parseDisputesListParams(useSearchParams());
  return (
    // Named by its tab ("Contestations") in the support tab bar.
    <section aria-label="Contestations" className="flex min-w-0 flex-col gap-4">
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
    <PillLink href={disputesListHref({ status, page: 1 })} active={active} label={label} count={count ?? null} />
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

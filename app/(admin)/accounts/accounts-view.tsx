"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { accountsListHref, parseAccountsListParams } from "@/lib/accounts-list-params";
import { accountCountQueryKey, fetchAccountCount, type AccountsListParams, type AccountStatus } from "@/lib/api/accounts";
import { PillLink } from "../stores/pill-link";
import { SearchBox } from "../stores/stores-view";
import { AccountsTable } from "./accounts-table";

const FILTERS: { status?: AccountStatus; label: string }[] = [
  { label: "Tous" },
  { status: "ACTIVE", label: "Actifs" },
  { status: "SUSPENDED", label: "Suspendus" },
];

export function AccountsView() {
  const params = parseAccountsListParams(useSearchParams());
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Filtrer par état" className="-mx-1 overflow-x-auto px-1">
          <ul className="flex gap-2">
            {FILTERS.map((filter) => (
              <li key={filter.label}>
                <Filter status={filter.status} label={filter.label} params={params} />
              </li>
            ))}
          </ul>
        </nav>
        <SearchBox
          id="account-search"
          q={params.q}
          hrefFor={(q) => accountsListHref({ status: params.status, q, page: 1 })}
          label="Rechercher un compte par numéro, nom ou téléphone"
          placeholder="Numéro, nom ou téléphone"
        />
      </div>
      <AccountsTable params={params} />
    </div>
  );
}

function Filter({ status, label, params }: { status?: AccountStatus; label: string; params: AccountsListParams }) {
  const count = useQuery({
    queryKey: accountCountQueryKey(status, params.q),
    queryFn: () => fetchAccountCount(status, params.q),
  }).data;
  return (
    <PillLink
      href={accountsListHref({ status, q: params.q, page: 1 })}
      active={status === params.status}
      label={label}
      count={count ?? null}
    />
  );
}

export function AccountsSkeleton() {
  return (
    <div role="status" aria-label="Chargement des comptes" className="flex flex-col gap-5">
      <Skeleton className="h-11 w-full max-w-xl rounded-full" />
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}

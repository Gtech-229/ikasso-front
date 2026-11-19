"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { fetchStoreCount, STORE_STATUS_LABELS, type StoreStatus, type StoresListParams } from "@/lib/api/stores";
import { storeCountQuery } from "@/lib/api/stores-queries";
import { parseStoresListParams, SEARCH_MAX_LENGTH, storesListHref } from "@/lib/stores-list-params";
import { PillLink, shownCount } from "./pill-link";
import { replaceStoresUrl } from "./shallow-link";
import { StoresTable } from "./stores-table";

function useStoreCount(status?: StoreStatus) {
  const { queryKey } = storeCountQuery(status);
  return useQuery({ queryKey, queryFn: () => fetchStoreCount(status) }).data;
}

export function StoresView() {
  const params = parseStoresListParams(useSearchParams());
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Kpis />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <StatusTabs params={params} />
        <SearchBox
          q={params.q}
          hrefFor={(q) => storesListHref({ status: params.status, q, page: 1 })}
          label="Rechercher une quincaillerie"
        />
      </div>
      <StoresTable params={params} />
    </div>
  );
}

function Kpis() {
  const pending = useStoreCount("PENDING");
  const verified = useStoreCount("VERIFIED");
  const suspended = useStoreCount("SUSPENDED");
  return (
    // One row of three on every width; smaller type on phones.
    <section aria-label="Chiffres clés" className="grid grid-cols-3 gap-2 sm:gap-3">
      <div className="relative overflow-hidden rounded-card bg-ink p-3 pb-5 text-surface sm:p-5 sm:pb-7">
        <p className="text-[13px] text-surface/70 sm:text-[14px]">À vérifier</p>
        <p className="font-display text-[28px] leading-tight font-bold sm:text-[36px]">{shownCount(pending)}</p>
        <div className="stripe absolute inset-x-0 bottom-0 h-2" />
      </div>
      <Kpi label="Vérifiées" value={shownCount(verified)} />
      <Kpi label="Suspendues" value={shownCount(suspended)} />
    </section>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card bg-surface p-3 sm:p-5">
      <p className="text-[13px] text-muted-ink sm:text-[14px]">{label}</p>
      <p className="font-display text-[28px] leading-tight font-bold sm:text-[36px]">{value}</p>
    </div>
  );
}

const TABS: { status?: StoreStatus; label: string }[] = [
  { label: "Toutes" },
  { status: "PENDING", label: "À vérifier" },
  { status: "VERIFIED", label: "Vérifiées" },
  { status: "SUSPENDED", label: "Suspendues" },
  { status: "CLOSED", label: "Fermées" },
];

function StatusTabs({ params }: { params: StoresListParams }) {
  return (
    <nav aria-label="Filtrer par statut" className="-mx-1 overflow-x-auto px-1">
      <ul className="flex gap-2">
        {TABS.map((tab) => (
          <li key={tab.label}>
            <Tab tab={tab} params={params} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Tab({ tab, params }: { tab: (typeof TABS)[number]; params: StoresListParams }) {
  const count = useStoreCount(tab.status);
  const active = tab.status === params.status;
  return (
    <PillLink
      href={storesListHref({ status: tab.status, q: params.q, page: 1 })}
      active={active}
      label={tab.label}
      count={count ?? null}
      title={tab.status ? STORE_STATUS_LABELS[tab.status] : "Toutes les quincailleries"}
    />
  );
}

const SEARCH_DELAY_MS = 300;
const TOO_LONG = "La recherche doit contenir 1 à 100 caractères";

/**
 * The list search box, written to the URL after a short pause.
 * `hrefFor` gives the list URL for a search (page 1, other filters kept).
 */
export function SearchBox({
  q,
  hrefFor,
  label,
  id = "store-search",
  placeholder = "Nom ou ville",
}: {
  q: string | undefined;
  hrefFor: (q: string | undefined) => string;
  label: string;
  id?: string;
  placeholder?: string;
}) {
  const urlQ = q ?? "";
  const [value, setValue] = useState(urlQ);
  const inputRef = useRef<HTMLInputElement>(null);

  // Follow the URL when it changes from outside (tab link, "Effacer", Back).
  const [seenQ, setSeenQ] = useState(urlQ);
  if (urlQ !== seenQ) {
    setSeenQ(urlQ);
    if (urlQ !== value.trim()) setValue(urlQ);
  }

  const trimmed = value.trim();
  const tooLong = [...trimmed].length > SEARCH_MAX_LENGTH;

  // A string, so a new `hrefFor` function on each render does not restart the pause.
  const target = hrefFor(trimmed || undefined);
  useEffect(() => {
    if (tooLong || trimmed === urlQ) return;
    const timer = setTimeout(() => replaceStoresUrl(target), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [trimmed, tooLong, urlQ, target]);

  return (
    <div className="flex w-full flex-col gap-1 lg:max-w-sm">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-ink" />
        <Input
          ref={inputRef}
          id={id}
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={tooLong || undefined}
          aria-describedby={tooLong ? `${id}-error` : undefined}
          className="pr-12 pl-11 [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              setValue("");
              // The button disappears once the field is empty: keep focus in the search.
              inputRef.current?.focus();
            }}
            aria-label="Effacer la recherche"
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-ink hover:text-ink"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        )}
      </div>
      {tooLong && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {TOO_LONG}
        </p>
      )}
    </div>
  );
}

export function StoresSkeleton() {
  return (
    <div role="status" aria-label="Chargement des quincailleries" className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-card sm:h-28" />
        ))}
      </div>
      <Skeleton className="h-11 w-full max-w-xl rounded-full" />
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}

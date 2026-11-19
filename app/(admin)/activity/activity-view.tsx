"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  activityHref,
  hasActivityFilters,
  isPeriodValid,
  parseActivityParams,
  PERIOD_ERROR,
} from "@/lib/activity-params";
import { ACTIVITY_ACTION_LABELS, ACTIVITY_ACTIONS, type ActivityAction, type ActivityListParams } from "@/lib/api/activity";
import { fetchStoreOptions, storeOptionsQueryKey } from "@/lib/api/stores";
import { can } from "@/lib/auth/permissions";
import { useCurrentAdmin } from "@/lib/auth/use-current-admin";
import { isDay } from "@/lib/subscription-form";
import { ShallowLink } from "../stores/shallow-link";
import { ActivityTable } from "./activity-table";

const SELECT_CLASS =
  "min-h-11 w-full rounded-control border border-border bg-surface px-3 text-[15px] text-ink focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

/** A filter change: the browser URL only (no server render), page 1. */
function go(params: ActivityListParams) {
  window.history.pushState(null, "", activityHref({ ...params, page: 1 }));
}

export function ActivityView() {
  const params = parseActivityParams(useSearchParams());
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <section aria-label="Filtres" className="flex flex-col gap-3 rounded-card bg-surface p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StoreFilter params={params} />
          <ActionFilter params={params} />
          {/* Remounted when the URL period changes (Back, "Effacer"): fresh drafts. */}
          <PeriodFilter key={`${params.from ?? ""}|${params.to ?? ""}`} params={params} />
        </div>
        {hasActivityFilters(params) && (
          <ShallowLink href="/activity" className={`${buttonVariants({ variant: "secondary" })} self-start`}>
            Effacer les filtres
          </ShallowLink>
        )}
      </section>
      <ActivityTable params={params} />
    </div>
  );
}

function StoreFilter({ params }: { params: ActivityListParams }) {
  const admin = useCurrentAdmin().data;
  const allowed = !!admin && can(admin, "stores.read");
  const stores = useQuery({
    queryKey: storeOptionsQueryKey,
    queryFn: fetchStoreOptions,
    enabled: allowed,
    // Optional: without it the select only offers "all".
    meta: { inlineError: true },
  }).data;
  if (!allowed) return null;

  const options = [...(stores?.items ?? [])].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const known = !params.storeId || options.some((store) => store.id === params.storeId);
  return (
    <Field>
      <FieldLabel htmlFor="activity-store">Quincaillerie</FieldLabel>
      <select
        id="activity-store"
        value={params.storeId ?? ""}
        onChange={(event) => go({ ...params, storeId: event.target.value || undefined })}
        className={SELECT_CLASS}
      >
        <option value="">Toutes les quincailleries</option>
        {/* A store from the URL outside the first 100 still filters. */}
        {!known && <option value={params.storeId}>Quincaillerie sélectionnée</option>}
        {options.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

function ActionFilter({ params }: { params: ActivityListParams }) {
  return (
    <Field>
      <FieldLabel htmlFor="activity-action">Action</FieldLabel>
      <select
        id="activity-action"
        value={params.action ?? ""}
        onChange={(event) => go({ ...params, action: (event.target.value || undefined) as ActivityAction | undefined })}
        className={SELECT_CLASS}
      >
        <option value="">Toutes les actions</option>
        {ACTIVITY_ACTIONS.map((action) => (
          <option key={action} value={action}>
            {ACTIVITY_ACTION_LABELS[action]}
          </option>
        ))}
      </select>
    </Field>
  );
}

/**
 * "Du" / "Au": a complete, valid period goes to the URL; "Au" before "Du" is
 * refused here with the API's message, before any request.
 */
function PeriodFilter({ params }: { params: ActivityListParams }) {
  const [from, setFrom] = useState(params.from ?? "");
  const [to, setTo] = useState(params.to ?? "");
  const [error, setError] = useState<string | null>(null);

  function change(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
    // A half-typed date ("") or an invalid one waits for the admin.
    if ((nextFrom && !isDay(nextFrom)) || (nextTo && !isDay(nextTo))) return;
    if (!isPeriodValid(nextFrom || undefined, nextTo || undefined)) {
      setError(PERIOD_ERROR);
      return;
    }
    setError(null);
    go({ ...params, from: nextFrom || undefined, to: nextTo || undefined });
  }

  return (
    <>
      <Field>
        <FieldLabel htmlFor="activity-from">Du</FieldLabel>
        <Input id="activity-from" type="date" value={from} onChange={(event) => change(event.target.value, to)} />
      </Field>
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="activity-to">Au</FieldLabel>
        <Input
          id="activity-to"
          type="date"
          value={to}
          onChange={(event) => change(from, event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "activity-to-error" : undefined}
        />
        <FieldError id="activity-to-error">{error}</FieldError>
      </Field>
    </>
  );
}

export function ActivitySkeleton() {
  return (
    <div role="status" aria-label="Chargement du journal" className="flex flex-col gap-5">
      <Skeleton className="h-24 rounded-card" />
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchSubscriptionCount,
  subscriptionCountQueryKey,
  type SubscriptionState,
} from "@/lib/api/stores";
import {
  parseSubscriptionsListParams,
  subscriptionsListHref,
  type SubscriptionsListParams,
} from "@/lib/subscriptions-list-params";
import { cn } from "@/lib/utils";
import { ShallowLink } from "../stores/shallow-link";
import { SearchBox } from "../stores/stores-view";
import { SubscriptionsTable } from "./subscriptions-table";

function useSubscriptionCount(state?: SubscriptionState) {
  return useQuery({
    queryKey: subscriptionCountQueryKey(state),
    queryFn: () => fetchSubscriptionCount(state),
  }).data;
}

// "—" until the API answers, never a guessed number.
const shown = (count: number | undefined) => (count === undefined ? "—" : String(count));

export function SubscriptionsView() {
  const params = parseSubscriptionsListParams(useSearchParams());
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Kpis />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <StateTabs params={params} />
        <SearchBox
          id="subscription-search"
          q={params.q}
          hrefFor={(q) => subscriptionsListHref({ subscriptionState: params.subscriptionState, q, page: 1 })}
          label="Rechercher une quincaillerie"
        />
      </div>
      <SubscriptionsTable params={params} />
    </div>
  );
}

function Kpis() {
  const expired = useSubscriptionCount("EXPIRED");
  const active = useSubscriptionCount("ACTIVE");
  const upcoming = useSubscriptionCount("UPCOMING");
  const none = useSubscriptionCount("NONE");
  return (
    // Two by two on phones, one row of four from sm.
    <section aria-label="Chiffres clés" className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {/* Expired first and dark: those stores need a renewal. */}
      <div className="relative overflow-hidden rounded-card bg-ink p-3 pb-5 text-surface sm:p-5 sm:pb-7">
        <p className="text-[13px] text-surface/70 sm:text-[14px]">Expirés</p>
        <p className="font-display text-[28px] leading-tight font-bold sm:text-[36px]">{shown(expired)}</p>
        <div className="stripe absolute inset-x-0 bottom-0 h-2" />
      </div>
      <Kpi label="Actifs" value={shown(active)} />
      <Kpi label="À venir" value={shown(upcoming)} />
      <Kpi label="Sans abonnement" value={shown(none)} />
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

const TABS: { state?: SubscriptionState; label: string; title: string }[] = [
  { label: "Tous", title: "Toutes les quincailleries" },
  { state: "ACTIVE", label: "Actifs", title: "Abonnement actif" },
  { state: "UPCOMING", label: "À venir", title: "Abonnement à venir" },
  { state: "EXPIRED", label: "Expirés", title: "Abonnement expiré" },
  { state: "NONE", label: "Sans abonnement", title: "Aucun abonnement enregistré" },
];

function StateTabs({ params }: { params: SubscriptionsListParams }) {
  return (
    <nav aria-label="Filtrer par abonnement" className="-mx-1 overflow-x-auto px-1">
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

function Tab({ tab, params }: { tab: (typeof TABS)[number]; params: SubscriptionsListParams }) {
  const count = useSubscriptionCount(tab.state);
  const active = tab.state === params.subscriptionState;
  return (
    <ShallowLink
      href={subscriptionsListHref({ subscriptionState: tab.state, q: params.q, page: 1 })}
      aria-current={active ? "page" : undefined}
      title={tab.title}
      className={cn(
        "flex min-h-11 items-center rounded-full px-4 text-[15px] font-semibold whitespace-nowrap transition-colors",
        active ? "bg-ink text-surface" : "bg-surface text-ink hover:bg-ink/5",
      )}
    >
      {tab.label} · {shown(count)}
    </ShallowLink>
  );
}

export function SubscriptionsSkeleton() {
  return (
    <div role="status" aria-label="Chargement des abonnements" className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-card sm:h-28" />
        ))}
      </div>
      <Skeleton className="h-11 w-full max-w-xl rounded-full" />
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}

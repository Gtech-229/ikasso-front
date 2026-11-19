import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { Forbidden } from "@/components/forbidden";
import {
  ALERT_STATES,
  alertCountPath,
  alertCountQueryKey,
  alertCountSchema,
  alertsPageSchema,
  alertsPath,
  alertsQueryKey,
} from "@/lib/api/alerts";
import { countriesQueryKey, countrySchema } from "@/lib/api/countries";
import {
  DISPUTE_STATUSES,
  disputeCountPath,
  disputeCountQueryKey,
  disputeCountSchema,
  disputesPageSchema,
  disputesPath,
  disputesQueryKey,
} from "@/lib/api/disputes";
import { serverFetch } from "@/lib/api/server";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { can } from "@/lib/auth/permissions";
import { parseDisputesListParams } from "@/lib/disputes-list-params";
import { getQueryClient } from "@/lib/query/get-query-client";
import { parseAlertsListParams, parseSupportTab, supportTabs } from "@/lib/support-params";
import { SupportSkeleton, SupportView } from "./support-view";

export const metadata: Metadata = { title: "Support · Ikasso Administration" };

// Support: disputes awaiting an answer (11a) and platform alerts (11b), as tabs.
export default function SupportPage({ searchParams }: PageProps<"/support">) {
  return (
    <div className="flex min-w-0 flex-col gap-5 p-5 md:p-8">
      <h1 className="font-display text-[32px] leading-tight font-bold">Support</h1>
      <Suspense fallback={<SupportSkeleton />}>
        <PrefetchedSupport searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function PrefetchedSupport({ searchParams }: Pick<PageProps<"/support">, "searchParams">) {
  // The page opens with either permission; each tab needs its own.
  const admin = await getCurrentAdmin();
  const tabs = supportTabs(admin);
  if (tabs.length === 0) return <Forbidden embedded />;

  const raw = await searchParams;
  const search = {
    get: (name: string) => {
      const value = raw[name];
      return (Array.isArray(value) ? value[0] : value) ?? null;
    },
  };
  const tab = parseSupportTab(search, tabs);

  // Only the shown tab's data, with the browser's keys.
  const queryClient = getQueryClient();
  if (tab === "disputes") {
    const params = parseDisputesListParams(search);
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: disputesQueryKey(params),
        queryFn: () => serverFetch(disputesPath(params), { schema: disputesPageSchema }),
      }),
      ...[undefined, ...DISPUTE_STATUSES].map((status) =>
        queryClient.prefetchQuery({
          queryKey: disputeCountQueryKey(status),
          queryFn: () => serverFetch(disputeCountPath(status), { schema: disputeCountSchema }),
        }),
      ),
      // The currency symbols of the amounts, so they show at once (F-36).
      can(admin, "countries.read") &&
        queryClient.prefetchQuery({
          queryKey: countriesQueryKey,
          queryFn: () => serverFetch("/admin/countries", { schema: z.array(countrySchema) }),
        }),
    ]);
  } else {
    const params = parseAlertsListParams(search);
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: alertsQueryKey(params),
        queryFn: () => serverFetch(alertsPath(params), { schema: alertsPageSchema }),
      }),
      ...ALERT_STATES.map((state) =>
        queryClient.prefetchQuery({
          queryKey: alertCountQueryKey(state, params.type),
          queryFn: () => serverFetch(alertCountPath(state, params.type), { schema: alertCountSchema }),
        }),
      ),
    ]);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SupportView />
    </HydrationBoundary>
  );
}

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";
import { serverFetch } from "@/lib/api/server";
import {
  countSchema,
  storesPageSchema,
  storesPath,
  storesQueryKey,
  subscriptionCountPath,
  subscriptionCountQueryKey,
} from "@/lib/api/stores";
import { SUBSCRIPTION_COUNT_FILTERS } from "@/lib/api/stores-queries";
import { RequirePermission } from "@/lib/auth/require-permission";
import { getQueryClient } from "@/lib/query/get-query-client";
import { parseSubscriptionsListParams } from "@/lib/subscriptions-list-params";
import { SubscriptionsSkeleton, SubscriptionsView } from "./subscriptions-view";

export const metadata: Metadata = { title: "Abonnements · Ikasso Administration" };

// Mockup 48. The title is static; the permission checks (session cookie) and
// the data load inside the boundary. The table comes from the stores list,
// which the API guards with stores.read.
export default function SubscriptionsPage({ searchParams }: PageProps<"/subscriptions">) {
  return (
    <div className="flex min-w-0 flex-col gap-5 p-5 md:p-8">
      <h1 className="font-display text-[32px] leading-tight font-bold">Abonnements</h1>
      <Suspense fallback={<SubscriptionsSkeleton />}>
        <RequirePermission permission="subscriptions.read">
          <RequirePermission permission="stores.read">
            <PrefetchedSubscriptions searchParams={searchParams} />
          </RequirePermission>
        </RequirePermission>
      </Suspense>
    </div>
  );
}

async function PrefetchedSubscriptions({ searchParams }: Pick<PageProps<"/subscriptions">, "searchParams">) {
  const raw = await searchParams;
  const params = parseSubscriptionsListParams({
    get: (name) => {
      const value = raw[name];
      return (Array.isArray(value) ? value[0] : value) ?? null;
    },
  });

  // Same keys as the browser, so the first client render needs no request.
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: storesQueryKey(params),
      queryFn: () => serverFetch(storesPath(params), { schema: storesPageSchema }),
    }),
    ...SUBSCRIPTION_COUNT_FILTERS.map((state) =>
      queryClient.prefetchQuery({
        queryKey: subscriptionCountQueryKey(state),
        queryFn: () => serverFetch(subscriptionCountPath(state), { schema: countSchema }),
      }),
    ),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SubscriptionsView />
    </HydrationBoundary>
  );
}

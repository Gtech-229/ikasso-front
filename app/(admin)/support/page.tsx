import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";
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
import { RequirePermission } from "@/lib/auth/require-permission";
import { parseDisputesListParams } from "@/lib/disputes-list-params";
import { getQueryClient } from "@/lib/query/get-query-client";
import { DisputesSkeleton, DisputesView } from "./disputes-view";

export const metadata: Metadata = { title: "Support · Ikasso Administration" };

// Support: the disputes still awaiting an answer (11a); alerts come with 11b.
export default function SupportPage({ searchParams }: PageProps<"/support">) {
  return (
    <div className="flex min-w-0 flex-col gap-5 p-5 md:p-8">
      <h1 className="font-display text-[32px] leading-tight font-bold">Support</h1>
      <Suspense fallback={<DisputesSkeleton />}>
        <RequirePermission permission="disputes.read">
          <PrefetchedDisputes searchParams={searchParams} />
        </RequirePermission>
      </Suspense>
    </div>
  );
}

async function PrefetchedDisputes({ searchParams }: Pick<PageProps<"/support">, "searchParams">) {
  const raw = await searchParams;
  const params = parseDisputesListParams({
    get: (name) => {
      const value = raw[name];
      return (Array.isArray(value) ? value[0] : value) ?? null;
    },
  });

  const queryClient = getQueryClient();
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
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DisputesView />
    </HydrationBoundary>
  );
}

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";
import { serverFetch } from "@/lib/api/server";
import { platformStatsSchema, statsPath, statsQueryKey } from "@/lib/api/stats";
import { RequirePermission } from "@/lib/auth/require-permission";
import { getQueryClient } from "@/lib/query/get-query-client";
import { parseStatsPeriod, statsPeriodRange, todayUtc } from "@/lib/stats-period";
import { StatsSkeleton, StatsView } from "./stats-view";

export const metadata: Metadata = { title: "Statistiques · Ikasso Administration" };

// Mockup 49. The title is static; the permission check and the data load
// inside the boundary.
export default function StatsPage({ searchParams }: PageProps<"/stats">) {
  return (
    <div className="flex min-w-0 flex-col gap-5 p-5 md:p-8">
      <h1 className="font-display text-[32px] leading-tight font-bold">Statistiques</h1>
      <Suspense fallback={<StatsSkeleton />}>
        <RequirePermission permission="stats.read">
          <PrefetchedStats searchParams={searchParams} />
        </RequirePermission>
      </Suspense>
    </div>
  );
}

async function PrefetchedStats({ searchParams }: Pick<PageProps<"/stats">, "searchParams">) {
  const raw = await searchParams;
  const period = parseStatsPeriod({
    get: (name) => {
      const value = raw[name];
      return (Array.isArray(value) ? value[0] : value) ?? null;
    },
  });
  const { from, to } = statsPeriodRange(period, todayUtc());

  // Same key as the browser. At midnight UTC the browser may compute the next
  // day: a different key, so it simply fetches, never shows a wrong range.
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: statsQueryKey(from, to),
    queryFn: () => serverFetch(statsPath(from, to), { schema: platformStatsSchema }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StatsView />
    </HydrationBoundary>
  );
}

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";
import { parseActivityParams } from "@/lib/activity-params";
import { activityPageSchema, activityPath, activityQueryKey } from "@/lib/api/activity";
import { serverFetch } from "@/lib/api/server";
import { STORE_OPTIONS_PATH, storeOptionsQueryKey, storesPageSchema } from "@/lib/api/stores";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { can } from "@/lib/auth/permissions";
import { RequirePermission } from "@/lib/auth/require-permission";
import { getQueryClient } from "@/lib/query/get-query-client";
import { ActivitySkeleton, ActivityView } from "./activity-view";

export const metadata: Metadata = { title: "Journal d’activité · Ikasso Administration" };

// The stores' activity log, read-only. The title is static; the permission
// check and the data load inside the boundary.
export default function ActivityPage({ searchParams }: PageProps<"/activity">) {
  return (
    <div className="flex min-w-0 flex-col gap-5 p-5 md:p-8">
      <h1 className="font-display text-[32px] leading-tight font-bold">Journal d’activité</h1>
      <Suspense fallback={<ActivitySkeleton />}>
        <RequirePermission permission="activity.read">
          <PrefetchedActivity searchParams={searchParams} />
        </RequirePermission>
      </Suspense>
    </div>
  );
}

async function PrefetchedActivity({ searchParams }: Pick<PageProps<"/activity">, "searchParams">) {
  const raw = await searchParams;
  const params = parseActivityParams({
    get: (name) => {
      const value = raw[name];
      return (Array.isArray(value) ? value[0] : value) ?? null;
    },
  });
  const admin = await getCurrentAdmin();

  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: activityQueryKey(params),
      queryFn: () => serverFetch(activityPath(params), { schema: activityPageSchema }),
    }),
    // The store filter's options, only for an admin who can list stores.
    can(admin, "stores.read") &&
      queryClient.prefetchQuery({
        queryKey: storeOptionsQueryKey,
        queryFn: () => serverFetch(STORE_OPTIONS_PATH, { schema: storesPageSchema }),
      }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ActivityView />
    </HydrationBoundary>
  );
}

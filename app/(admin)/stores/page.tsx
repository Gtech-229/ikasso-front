import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";
import { serverFetch } from "@/lib/api/server";
import { countSchema, storesPageSchema, storesPath, storesQueryKey } from "@/lib/api/stores";
import { STORE_COUNT_FILTERS, storeCountQuery } from "@/lib/api/stores-queries";
import { RequirePermission } from "@/lib/auth/require-permission";
import { getQueryClient } from "@/lib/query/get-query-client";
import { parseStoresListParams } from "@/lib/stores-list-params";
import { StoresSkeleton, StoresView } from "./stores-view";

export const metadata: Metadata = { title: "Quincailleries · Ikasso Administration" };

// Mockup 46. The title is static, so a client navigation shows it at once; the
// permission check (session cookie) and the data load inside the boundary.
export default function StoresPage({ searchParams }: PageProps<"/stores">) {
  return (
    <div className="flex min-w-0 flex-col gap-5 p-5 md:p-8">
      <h1 className="font-display text-[32px] leading-tight font-bold">Quincailleries</h1>
      <Suspense fallback={<StoresSkeleton />}>
        <RequirePermission permission="stores.read">
          <PrefetchedStores searchParams={searchParams} />
        </RequirePermission>
      </Suspense>
    </div>
  );
}

async function PrefetchedStores({ searchParams }: Pick<PageProps<"/stores">, "searchParams">) {
  const raw = await searchParams;
  const params = parseStoresListParams({
    get: (name) => {
      const value = raw[name];
      return (Array.isArray(value) ? value[0] : value) ?? null;
    },
  });

  // Same keys as the browser, so the first client render needs no request. A
  // failed prefetch is not sent down; the browser then fetches it itself.
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: storesQueryKey(params),
      queryFn: () => serverFetch(storesPath(params), { schema: storesPageSchema }),
    }),
    ...STORE_COUNT_FILTERS.map((status) => {
      const { queryKey, path } = storeCountQuery(status);
      return queryClient.prefetchQuery({
        queryKey,
        queryFn: () => serverFetch(path, { schema: countSchema }),
      });
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StoresView />
    </HydrationBoundary>
  );
}

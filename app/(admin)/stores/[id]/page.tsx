import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { serverFetch } from "@/lib/api/server";
import { storeDetailPath, storeDetailQueryKey, storeDetailSchema } from "@/lib/api/stores";
import { RequirePermission } from "@/lib/auth/require-permission";
import { getQueryClient } from "@/lib/query/get-query-client";
import { StoreSkeleton, StoreView } from "./store-view";

export const metadata: Metadata = { title: "Quincaillerie · Ikasso Administration" };

// Back link and title render at once; the permission check and the store load
// inside the boundary (same pattern as the verification page).
export default function StorePage({ params }: PageProps<"/stores/[id]">) {
  return (
    <div className="flex min-w-0 flex-col gap-5 p-5 md:p-8">
      <Link
        href="/stores"
        className="flex min-h-11 w-fit items-center gap-2 text-[15px] font-semibold text-muted-ink hover:text-ink"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Quincailleries
      </Link>
      <h1 className="font-display text-[32px] leading-tight font-bold">Quincaillerie</h1>
      <Suspense fallback={<StoreSkeleton />}>
        <RequirePermission permission="stores.read">
          <PrefetchedStore params={params} />
        </RequirePermission>
      </Suspense>
    </div>
  );
}

async function PrefetchedStore({ params }: Pick<PageProps<"/stores/[id]">, "params">) {
  const { id } = await params;
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: storeDetailQueryKey(id),
    queryFn: () => serverFetch(storeDetailPath(id), { schema: storeDetailSchema }),
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StoreView id={id} />
    </HydrationBoundary>
  );
}

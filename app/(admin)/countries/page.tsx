import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { COUNTRIES_PATH, countriesQueryKey, countrySchema } from "@/lib/api/countries";
import { serverFetch } from "@/lib/api/server";
import { RequirePermission } from "@/lib/auth/require-permission";
import { getQueryClient } from "@/lib/query/get-query-client";
import { CountriesSkeleton, CountriesView } from "./countries-view";

export const metadata: Metadata = { title: "Pays · Ikasso Administration" };

// The countries and their currency. The title is static; the permission check
// and the data load inside the boundary.
export default function CountriesPage() {
  return (
    <div className="flex min-w-0 flex-col gap-5 p-5 md:p-8">
      <h1 className="font-display text-[32px] leading-tight font-bold">Pays</h1>
      <Suspense fallback={<CountriesSkeleton />}>
        <RequirePermission permission="countries.read">
          <PrefetchedCountries />
        </RequirePermission>
      </Suspense>
    </div>
  );
}

async function PrefetchedCountries() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: countriesQueryKey,
    queryFn: () => serverFetch(COUNTRIES_PATH, { schema: z.array(countrySchema) }),
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CountriesView />
    </HydrationBoundary>
  );
}

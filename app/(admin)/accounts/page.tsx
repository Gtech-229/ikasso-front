import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";
import { parseAccountsListParams } from "@/lib/accounts-list-params";
import {
  ACCOUNT_STATUSES,
  accountCountPath,
  accountCountQueryKey,
  accountCountSchema,
  accountsPageSchema,
  accountsPath,
  accountsQueryKey,
} from "@/lib/api/accounts";
import { serverFetch } from "@/lib/api/server";
import { RequirePermission } from "@/lib/auth/require-permission";
import { getQueryClient } from "@/lib/query/get-query-client";
import { AccountsSkeleton, AccountsView } from "./accounts-view";

export const metadata: Metadata = { title: "Comptes clients · Ikasso Administration" };

// Customer accounts across stores. The title is static; the permission check
// and the data load inside the boundary.
export default function AccountsPage({ searchParams }: PageProps<"/accounts">) {
  return (
    <div className="flex min-w-0 flex-col gap-5 p-5 md:p-8">
      <h1 className="font-display text-[32px] leading-tight font-bold">Comptes clients</h1>
      <Suspense fallback={<AccountsSkeleton />}>
        <RequirePermission permission="accounts.read">
          <PrefetchedAccounts searchParams={searchParams} />
        </RequirePermission>
      </Suspense>
    </div>
  );
}

async function PrefetchedAccounts({ searchParams }: Pick<PageProps<"/accounts">, "searchParams">) {
  const raw = await searchParams;
  const params = parseAccountsListParams({
    get: (name) => {
      const value = raw[name];
      return (Array.isArray(value) ? value[0] : value) ?? null;
    },
  });

  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: accountsQueryKey(params),
      queryFn: () => serverFetch(accountsPath(params), { schema: accountsPageSchema }),
    }),
    ...[undefined, ...ACCOUNT_STATUSES].map((status) =>
      queryClient.prefetchQuery({
        queryKey: accountCountQueryKey(status, params.q),
        queryFn: () => serverFetch(accountCountPath(status, params.q), { schema: accountCountSchema }),
      }),
    ),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AccountsView />
    </HydrationBoundary>
  );
}

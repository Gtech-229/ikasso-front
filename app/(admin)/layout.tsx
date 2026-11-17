import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { currentAdminQueryKey } from "@/lib/api/admin-auth";
import { serverFetch } from "@/lib/api/server";
import { countSchema, pendingStoresCountQueryKey, storeCountPath } from "@/lib/api/stores";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { can } from "@/lib/auth/permissions";
import { getQueryClient } from "@/lib/query/get-query-client";
import { AdminShell } from "./admin-shell";

// Every page in this group needs a signed-in admin.
export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <SessionGate>{children}</SessionGate>
    </Suspense>
  );
}

async function SessionGate({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin();
  const queryClient = getQueryClient();
  queryClient.setQueryData(currentAdminQueryKey, admin);
  // The sidebar badge reads this count before any page boundary hydrates;
  // loading it here lets the badge and the stores KPI start from the same data.
  if (can(admin, "stores.read")) {
    await queryClient.prefetchQuery({
      queryKey: pendingStoresCountQueryKey,
      queryFn: () => serverFetch(storeCountPath("PENDING"), { schema: countSchema }),
    });
  }
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AdminShell>{children}</AdminShell>
    </HydrationBoundary>
  );
}

function AdminLoading() {
  return (
    <main className="flex flex-1 items-center justify-center p-5">
      <p role="status" className="text-[15px] text-muted-ink">
        Chargement…
      </p>
    </main>
  );
}

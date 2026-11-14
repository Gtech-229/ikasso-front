import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { currentAdminQueryKey } from "@/lib/api/admin-auth";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { getQueryClient } from "@/lib/query/get-query-client";

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
  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
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

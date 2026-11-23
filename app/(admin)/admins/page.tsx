import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { ADMINS_PATH, adminsQueryKey, adminSummarySchema } from "@/lib/api/admins";
import { ROLES_PATH, roleSchema, rolesQueryKey } from "@/lib/api/roles";
import { serverFetch } from "@/lib/api/server";
import { RequireSuperAdmin } from "@/lib/auth/require-permission";
import { getQueryClient } from "@/lib/query/get-query-client";
import { AdminsSkeleton, AdminsView } from "./admins-view";

export const metadata: Metadata = { title: "Administrateurs · Ikasso Administration" };

// The super admin manages the other admins (feature 15). The title is static;
// the super-admin check and the data load inside the boundary.
export default function AdminsPage() {
  return (
    <div className="flex min-w-0 flex-col gap-5 p-5 md:p-8">
      <h1 className="font-display text-[32px] leading-tight font-bold">Administrateurs</h1>
      <Suspense fallback={<AdminsSkeleton />}>
        <RequireSuperAdmin>
          <PrefetchedAdmins />
        </RequireSuperAdmin>
      </Suspense>
    </div>
  );
}

async function PrefetchedAdmins() {
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: adminsQueryKey,
      queryFn: () => serverFetch(ADMINS_PATH, { schema: z.array(adminSummarySchema) }),
    }),
    queryClient.prefetchQuery({
      queryKey: rolesQueryKey,
      queryFn: () => serverFetch(ROLES_PATH, { schema: z.array(roleSchema) }),
    }),
  ]);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AdminsView />
    </HydrationBoundary>
  );
}

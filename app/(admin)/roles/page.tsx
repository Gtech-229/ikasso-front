import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import {
  PERMISSIONS_PATH,
  permissionSchema,
  permissionsQueryKey,
  ROLES_PATH,
  roleSchema,
  rolesQueryKey,
} from "@/lib/api/roles";
import { serverFetch } from "@/lib/api/server";
import { RequireSuperAdmin } from "@/lib/auth/require-permission";
import { getQueryClient } from "@/lib/query/get-query-client";
import { RolesSkeleton, RolesView } from "./roles-view";

export const metadata: Metadata = { title: "Rôles et permissions · Ikasso Administration" };

// The super admin manages the roles that decide each admin's access (feature
// 16). The title is static; the super-admin check and the data load inside the
// boundary.
export default function RolesPage() {
  return (
    <div className="flex min-w-0 flex-col gap-5 p-5 md:p-8">
      <h1 className="font-display text-[32px] leading-tight font-bold">Rôles et permissions</h1>
      <Suspense fallback={<RolesSkeleton />}>
        <RequireSuperAdmin>
          <PrefetchedRoles />
        </RequireSuperAdmin>
      </Suspense>
    </div>
  );
}

async function PrefetchedRoles() {
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: rolesQueryKey,
      queryFn: () => serverFetch(ROLES_PATH, { schema: z.array(roleSchema) }),
    }),
    queryClient.prefetchQuery({
      queryKey: permissionsQueryKey,
      queryFn: () => serverFetch(PERMISSIONS_PATH, { schema: z.array(permissionSchema) }),
    }),
  ]);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RolesView />
    </HydrationBoundary>
  );
}

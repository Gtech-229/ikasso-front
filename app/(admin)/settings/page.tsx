import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";
import { serverFetch } from "@/lib/api/server";
import { SYSTEM_SETTINGS_PATH, systemSettingsQueryKey, systemSettingsSchema } from "@/lib/api/system-settings";
import { RequirePermission } from "@/lib/auth/require-permission";
import { getQueryClient } from "@/lib/query/get-query-client";
import { SettingsSkeleton, SettingsView } from "./settings-view";

export const metadata: Metadata = { title: "Paramètres · Ikasso Administration" };

// The platform's settings (feature 17). The title is static; the permission
// check and the data load inside the boundary. Editing also needs
// settings.manage, checked in the view.
export default function SettingsPage() {
  return (
    <div className="flex min-w-0 flex-col gap-5 p-5 md:p-8">
      <h1 className="font-display text-[32px] leading-tight font-bold">Paramètres</h1>
      <Suspense fallback={<SettingsSkeleton />}>
        <RequirePermission permission="settings.read">
          <PrefetchedSettings />
        </RequirePermission>
      </Suspense>
    </div>
  );
}

async function PrefetchedSettings() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: systemSettingsQueryKey,
    queryFn: () => serverFetch(SYSTEM_SETTINGS_PATH, { schema: systemSettingsSchema }),
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SettingsView />
    </HydrationBoundary>
  );
}

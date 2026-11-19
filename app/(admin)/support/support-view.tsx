"use client";

import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentAdmin } from "@/lib/auth/use-current-admin";
import { parseSupportTab, supportTabs, type SupportTab } from "@/lib/support-params";
import { PillLink } from "../stores/pill-link";
import { AlertsView } from "./alerts-view";
import { DisputesView } from "./disputes-view";

const TAB_LABELS: Record<SupportTab, string> = { disputes: "Contestations", alerts: "Alertes" };
// Each tab opens on its default filters.
const TAB_HREFS: Record<SupportTab, string> = { disputes: "/support", alerts: "/support?tab=alerts" };

export function SupportView() {
  const search = useSearchParams();
  // Hydrated by the admin layout, like the server's getCurrentAdmin.
  const admin = useCurrentAdmin().data;
  if (!admin) return <SupportSkeleton />;
  const tabs = supportTabs(admin);
  const tab = parseSupportTab(search, tabs);
  if (!tab) return null;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {/* One section only: its name as a heading instead of a single tab. */}
      {tabs.length === 1 && <h2 className="font-display text-[22px] font-bold">{TAB_LABELS[tab]}</h2>}
      {tabs.length > 1 && (
        <nav aria-label="Sections du support" className="-mx-1 overflow-x-auto px-1">
          <ul className="flex gap-2">
            {tabs.map((option) => (
              <li key={option}>
                <PillLink href={TAB_HREFS[option]} active={option === tab} label={TAB_LABELS[option]} />
              </li>
            ))}
          </ul>
        </nav>
      )}
      {tab === "disputes" ? <DisputesView /> : <AlertsView />}
    </div>
  );
}

export function SupportSkeleton() {
  return (
    <div role="status" aria-label="Chargement du support" className="flex flex-col gap-4">
      <Skeleton className="h-11 w-64 rounded-full" />
      <Skeleton className="h-11 w-full max-w-xl rounded-full" />
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}

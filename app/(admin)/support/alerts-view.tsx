"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  ALERT_STATE_LABELS,
  ALERT_STATES,
  ALERT_TYPE_LABELS,
  ALERT_TYPES,
  alertCountQueryKey,
  fetchAlertCount,
  type AlertsListParams,
  type AlertState,
  type AlertType,
} from "@/lib/api/alerts";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { useCurrentAdmin } from "@/lib/auth/use-current-admin";
import { alertsListHref, parseAlertsListParams } from "@/lib/support-params";
import { PillLink } from "../stores/pill-link";
import { AlertsTable } from "./alerts-table";

export function AlertsView() {
  const params = parseAlertsListParams(useSearchParams());
  return (
    // Named by its tab ("Alertes") in the support tab bar.
    <section aria-label="Alertes" className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Filtrer par état" className="-mx-1 overflow-x-auto px-1">
          <ul className="flex gap-2">
            {ALERT_STATES.map((state) => (
              <li key={state}>
                <StateFilter state={state} params={params} />
              </li>
            ))}
          </ul>
        </nav>
        <TypeSelect params={params} />
      </div>
      <AlertsTable params={params} />
    </section>
  );
}

function StateFilter({ state, params }: { state: AlertState; params: AlertsListParams }) {
  const count = useQuery({
    queryKey: alertCountQueryKey(state, params.type),
    queryFn: () => fetchAlertCount(state, params.type),
  }).data;
  return (
    <PillLink
      href={alertsListHref({ state, type: params.type, page: 1 })}
      active={state === params.state}
      label={ALERT_STATE_LABELS[state]}
      count={count ?? null}
    />
  );
}

function TypeSelect({ params }: { params: AlertsListParams }) {
  const admin = useCurrentAdmin().data;
  // The API lists WhatsApp settings changes to the super admin only.
  const types = ALERT_TYPES.filter(
    (type) => type !== "WHATSAPP_SETTINGS_CHANGED" || (admin && isSuperAdmin(admin)),
  );
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="alert-type" className="sr-only">
        Type d’alerte
      </label>
      <select
        id="alert-type"
        value={params.type ?? ""}
        onChange={(event) => {
          const type = (event.target.value || undefined) as AlertType | undefined;
          // Same as a filter link: the browser URL only, the queries follow.
          window.history.pushState(null, "", alertsListHref({ state: params.state, type, page: 1 }));
        }}
        className="min-h-11 rounded-control border border-border bg-surface px-3 text-[15px] text-ink focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <option value="">Tous les types</option>
        {types.map((type) => (
          <option key={type} value={type}>
            {ALERT_TYPE_LABELS[type]}
          </option>
        ))}
      </select>
    </div>
  );
}

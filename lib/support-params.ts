import { ALERT_STATES, ALERT_TYPES, type AlertsListParams, type AlertState, type AlertType } from "@/lib/api/alerts";
import type { CurrentAdmin } from "@/lib/api/admin-auth";
import { can } from "@/lib/auth/permissions";
import { parseStoresListParams } from "@/lib/stores-list-params";

type Readable = { get(name: string): string | null };

export type SupportTab = "disputes" | "alerts";

/** The tabs this admin may open, Contestations first. */
export function supportTabs(admin: CurrentAdmin): SupportTab[] {
  const tabs: SupportTab[] = [];
  if (can(admin, "disputes.read")) tabs.push("disputes");
  if (can(admin, "alerts.read")) tabs.push("alerts");
  return tabs;
}

/** `?tab=alerts`; an unknown or forbidden tab falls back to the first allowed one. */
export function parseSupportTab(search: Readable, allowed: SupportTab[]): SupportTab | null {
  const wanted = search.get("tab") === "alerts" ? "alerts" : "disputes";
  return allowed.includes(wanted) ? wanted : (allowed[0] ?? null);
}

function isAlertState(value: string | null): value is AlertState {
  return (ALERT_STATES as readonly string[]).includes(value ?? "");
}

function isAlertType(value: string | null): value is AlertType {
  return (ALERT_TYPES as readonly string[]).includes(value ?? "");
}

/** The types this admin can see: the API lists WhatsApp settings changes to the super admin only. */
export function visibleAlertTypes(superAdmin: boolean): AlertType[] {
  return ALERT_TYPES.filter((type) => superAdmin || type !== "WHATSAPP_SETTINGS_CHANGED");
}

/**
 * `/support?tab=alerts&state=resolved&type=GOAL_SUM_GAP&page=2`; defaults: open,
 * all types, page 1. A type the admin cannot see counts as all types, so the
 * list matches the select (and server and browser compute the same keys).
 */
export function parseAlertsListParams(search: Readable, { superAdmin }: { superAdmin: boolean }): AlertsListParams {
  const state = search.get("state");
  const type = search.get("type");
  return {
    state: isAlertState(state) ? state : "open",
    ...(isAlertType(type) && visibleAlertTypes(superAdmin).includes(type) && { type }),
    page: parseStoresListParams(search).page,
  };
}

/** Alert links carry `tab=alerts`; the default state, page 1 and empty values are left out. */
export function alertsListHref({ state, type, page }: AlertsListParams): string {
  const search = new URLSearchParams({ tab: "alerts" });
  if (state !== "open") search.set("state", state);
  if (type) search.set("type", type);
  if (page > 1) search.set("page", String(page));
  return `/support?${search}`;
}

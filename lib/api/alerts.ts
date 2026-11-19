import { z } from "zod";
import { apiFetch } from "./client";
import { paginatedSchema } from "./pagination";

export const ALERT_TYPES = [
  "ACCOUNT_BALANCE_GAP",
  "GOAL_BALANCE_GAP",
  "GOAL_SUM_GAP",
  "ORDER_CANCELLATION_UNANSWERED",
  "CODE_LIMIT_REACHED",
  "WHATSAPP_SETTINGS_CHANGED",
] as const;
export const alertTypeSchema = z.enum(ALERT_TYPES);
export type AlertType = z.infer<typeof alertTypeSchema>;

/** The API's `status` filter: open (to handle, its default), resolved or all. */
export const ALERT_STATES = ["open", "resolved", "all"] as const;
export type AlertState = (typeof ALERT_STATES)[number];

const adminName = z.object({ id: z.string(), firstName: z.string(), lastName: z.string() });

/** `GET /admin/alerts` item: never a balance, only the gap. */
export const alertSchema = z.object({
  id: z.string(),
  type: alertTypeSchema,
  store: z.object({ id: z.string(), name: z.string() }).nullable(),
  account: z.object({ id: z.string(), number: z.string() }).nullable(),
  goal: z.object({ id: z.string(), label: z.string() }).nullable(),
  order: z.object({ id: z.string(), reference: z.string() }).nullable(),
  // Recorded minus recomputed balance, smallest currency unit, may be negative.
  difference: z.string().regex(/^-?\d{1,19}$/).nullable(),
  createdAt: z.string(),
  resolvedAt: z.string().nullable(),
  resolvedBy: adminName.nullable(),
  whatsappChange: z
    .object({
      id: z.string(),
      changedAt: z.string(),
      changedBy: adminName,
      enabledBefore: z.boolean(),
      enabledAfter: z.boolean(),
      instanceIdChanged: z.boolean(),
      tokenChanged: z.boolean(),
    })
    .nullable(),
});
export type Alert = z.infer<typeof alertSchema>;

export const alertsPageSchema = paginatedSchema(alertSchema);
export const alertCountSchema = alertsPageSchema.transform((page) => page.total);

export const ALERTS_PAGE_SIZE = 20;

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  ACCOUNT_BALANCE_GAP: "Écart de solde d’un compte",
  GOAL_BALANCE_GAP: "Écart de solde d’un objectif",
  GOAL_SUM_GAP: "Objectifs ≠ solde du compte",
  ORDER_CANCELLATION_UNANSWERED: "Demande d’annulation sans réponse",
  CODE_LIMIT_REACHED: "Plafond de codes de connexion atteint",
  WHATSAPP_SETTINGS_CHANGED: "Paramètres WhatsApp modifiés",
};

export const ALERT_STATE_LABELS: Record<AlertState, string> = {
  open: "À traiter",
  resolved: "Traitées",
  all: "Toutes",
};

export interface AlertsListParams {
  state: AlertState;
  type?: AlertType;
  page: number;
}

export const alertsQueryKey = ({ state, type, page }: AlertsListParams) =>
  ["alerts", "list", { state, type: type ?? null, page }] as const;

export function alertsPath({ state, type, page }: AlertsListParams, pageSize = ALERTS_PAGE_SIZE): string {
  const search = new URLSearchParams({ status: state, page: String(page), pageSize: String(pageSize) });
  if (type) search.set("type", type);
  return `/admin/alerts?${search}`;
}

export function fetchAlerts(params: AlertsListParams) {
  return apiFetch(alertsPath(params), { schema: alertsPageSchema });
}

/** The state pill counts follow the selected type. */
export const alertCountQueryKey = (state: AlertState, type?: AlertType) =>
  ["alerts", "count", state, type ?? null] as const;

export const alertCountPath = (state: AlertState, type?: AlertType) => alertsPath({ state, type, page: 1 }, 1);

export function fetchAlertCount(state: AlertState, type?: AlertType): Promise<number> {
  return apiFetch(alertCountPath(state, type), { schema: alertCountSchema });
}

/** `PATCH /admin/alerts/:id/resolve` (alerts.manage): records who and when, changes no balance. */
export function resolveAlert(id: string): Promise<Alert> {
  return apiFetch(`/admin/alerts/${encodeURIComponent(id)}/resolve`, { method: "PATCH", schema: alertSchema });
}

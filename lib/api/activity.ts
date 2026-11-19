import { z } from "zod";
import { apiFetch } from "./client";
import { paginatedSchema } from "./pagination";

export const ACTIVITY_ACTIONS = [
  "SELLER_ADDED",
  "SELLER_DEACTIVATED",
  "SELLER_REACTIVATED",
  "ACCOUNT_OPENED",
  "ID_PHOTO_UPLOADED",
  "ARTICLE_CATEGORY_CREATED",
  "ARTICLE_CATEGORY_RENAMED",
  "ARTICLE_CREATED",
  "ARTICLE_UPDATED",
  "ARTICLE_PRICE_CHANGED",
  "STORE_QR_CODE_REGENERATED",
  "ACCESS_RESET",
  "SECURITY_QUESTIONS_CLEARED",
  "PROOF_ATTACHED",
  "PROOF_REMOVED",
  "REPORT_EXPORTED",
] as const;
export const activityActionSchema = z.enum(ACTIVITY_ACTIONS);
export type ActivityAction = z.infer<typeof activityActionSchema>;

export const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
  SELLER_ADDED: "Vendeur ajouté",
  SELLER_DEACTIVATED: "Vendeur désactivé",
  SELLER_REACTIVATED: "Vendeur réactivé",
  ACCOUNT_OPENED: "Compte ouvert",
  ID_PHOTO_UPLOADED: "Photo d’identité ajoutée",
  ARTICLE_CATEGORY_CREATED: "Catégorie créée",
  ARTICLE_CATEGORY_RENAMED: "Catégorie renommée",
  ARTICLE_CREATED: "Article créé",
  ARTICLE_UPDATED: "Article modifié",
  ARTICLE_PRICE_CHANGED: "Prix modifié",
  STORE_QR_CODE_REGENERATED: "QR code régénéré",
  ACCESS_RESET: "Accès réinitialisé",
  SECURITY_QUESTIONS_CLEARED: "Questions de sécurité effacées",
  PROOF_ATTACHED: "Justificatif ajouté",
  PROOF_REMOVED: "Justificatif retiré",
  REPORT_EXPORTED: "Rapport exporté",
};

/** `GET /admin/activity` item: names only, never a phone or PIN. */
export const activityEntrySchema = z.object({
  id: z.string(),
  action: activityActionSchema,
  author: z.object({ userId: z.string(), firstName: z.string(), lastName: z.string() }),
  // Shape depends on the action; shown as plain text by formatActivityValue.
  oldValue: z.unknown(),
  newValue: z.unknown(),
  device: z.string().nullable(),
  createdAt: z.string(),
  store: z.object({ id: z.string(), name: z.string() }).nullable(),
});
export type ActivityEntry = z.infer<typeof activityEntrySchema>;

export const activityPageSchema = paginatedSchema(activityEntrySchema);

export const ACTIVITY_PAGE_SIZE = 20;

export interface ActivityListParams {
  storeId?: string;
  action?: ActivityAction;
  /** Days `YYYY-MM-DD`, UTC, both included. */
  from?: string;
  to?: string;
  page: number;
}

export const activityQueryKey = ({ storeId, action, from, to, page }: ActivityListParams) =>
  ["activity", "list", { storeId: storeId ?? null, action: action ?? null, from: from ?? null, to: to ?? null, page }] as const;

export function activityPath({ storeId, action, from, to, page }: ActivityListParams): string {
  const search = new URLSearchParams({ page: String(page), pageSize: String(ACTIVITY_PAGE_SIZE) });
  if (storeId) search.set("storeId", storeId);
  if (action) search.set("action", action);
  if (from) search.set("from", from);
  if (to) search.set("to", to);
  return `/admin/activity?${search}`;
}

export function fetchActivity(params: ActivityListParams) {
  return apiFetch(activityPath(params), { schema: activityPageSchema });
}

/**
 * A logged value as plain text lines: nothing for null, the value for a
 * primitive (booleans "oui" / "non"), one "clé : valeur" line per key for an
 * object (nested values as compact JSON).
 */
export function formatActivityValue(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (typeof value === "boolean") return [value ? "oui" : "non"];
  if (typeof value === "string" || typeof value === "number") return [String(value)];
  if (Array.isArray(value)) return [JSON.stringify(value)];
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(([key, item]) => {
      const text =
        item === null || item === undefined
          ? "—"
          : typeof item === "boolean"
            ? item ? "oui" : "non"
            : typeof item === "object"
              ? JSON.stringify(item)
              : String(item);
      return `${key} : ${text}`;
    });
  }
  return [String(value)];
}

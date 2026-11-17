import { z } from "zod";
import { apiFetch } from "./client";
import { paginatedSchema } from "./pagination";

export const STORE_STATUSES = ["PENDING", "VERIFIED", "SUSPENDED", "CLOSED"] as const;
export const storeStatusSchema = z.enum(STORE_STATUSES);
export type StoreStatus = z.infer<typeof storeStatusSchema>;

export const subscriptionStateSchema = z.enum(["ACTIVE", "UPCOMING", "EXPIRED", "NONE"]);
export type SubscriptionState = z.infer<typeof subscriptionStateSchema>;

const subscriptionSchema = z.object({
  id: z.string(),
  storeId: z.string(),
  plan: z.enum(["TRIAL", "STANDARD", "PRO"]),
  startsOn: z.string(),
  endsOn: z.string(),
  status: z.string(),
  createdAt: z.string(),
});

/** One line of `GET /admin/stores`. */
export const storeSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  countryCode: z.string(),
  phone: z.string(),
  status: storeStatusSchema,
  createdAt: z.string(),
  subscriptionState: subscriptionStateSchema,
  currentSubscription: subscriptionSchema.nullable(),
});
export type StoreSummary = z.infer<typeof storeSummarySchema>;

export const storesPageSchema = paginatedSchema(storeSummarySchema);
export type StoresPage = z.infer<typeof storesPageSchema>;

export const STORES_PAGE_SIZE = 20;

export interface StoresListParams {
  status?: StoreStatus;
  q?: string;
  page: number;
}

export const storesQueryKey = ({ status, q, page }: StoresListParams) =>
  ["stores", "list", { status: status ?? null, q: q ?? null, page }] as const;

/** `/admin/stores?...` for a page of the list (also used by the server prefetch). */
export function storesPath({ status, q, page }: StoresListParams): string {
  const search = new URLSearchParams({ page: String(page), pageSize: String(STORES_PAGE_SIZE) });
  if (status) search.set("status", status);
  if (q) search.set("q", q);
  return `/admin/stores?${search}`;
}

export function fetchStores(params: StoresListParams): Promise<StoresPage> {
  return apiFetch(storesPath(params), { schema: storesPageSchema });
}

// Counts read `total` from the smallest page the API accepts (one item).
const countPageSchema = paginatedSchema(z.unknown());

export const storeCountQueryKey = (status?: StoreStatus) =>
  ["stores", "count", status ?? "ALL"] as const;

export function storeCountPath(status?: StoreStatus): string {
  return `/admin/stores?${status ? `status=${status}&` : ""}page=1&pageSize=1`;
}

export const countSchema = countPageSchema.transform((page) => page.total);

export function fetchStoreCount(status?: StoreStatus): Promise<number> {
  return apiFetch(storeCountPath(status), { schema: countSchema });
}

/** Sidebar badge and the "À vérifier" KPI share this query. */
export const pendingStoresCountQueryKey = ["stores", "pending-count"] as const;

export function fetchPendingStoresCount(): Promise<number> {
  return fetchStoreCount("PENDING");
}

export const STORE_STATUS_LABELS: Record<StoreStatus, string> = {
  PENDING: "À vérifier",
  VERIFIED: "Vérifiée",
  SUSPENDED: "Suspendue",
  CLOSED: "Fermée",
};

export const SUBSCRIPTION_STATE_LABELS: Record<SubscriptionState, string> = {
  ACTIVE: "Actif",
  UPCOMING: "À venir",
  EXPIRED: "Expiré",
  NONE: "Aucun",
};

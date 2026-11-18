import { z } from "zod";
import { apiFetch } from "./client";
import { paginatedSchema } from "./pagination";

export const STORE_STATUSES = ["PENDING", "VERIFIED", "SUSPENDED", "CLOSED"] as const;
export const storeStatusSchema = z.enum(STORE_STATUSES);
export type StoreStatus = z.infer<typeof storeStatusSchema>;

export const SUBSCRIPTION_STATES = ["ACTIVE", "UPCOMING", "EXPIRED", "NONE"] as const;
export const subscriptionStateSchema = z.enum(SUBSCRIPTION_STATES);
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
  /** The subscriptions page filters on this instead of the status. */
  subscriptionState?: SubscriptionState;
  q?: string;
  page: number;
}

export const storesQueryKey = ({ status, subscriptionState, q, page }: StoresListParams) =>
  [
    "stores",
    "list",
    { status: status ?? null, subscriptionState: subscriptionState ?? null, q: q ?? null, page },
  ] as const;

/** `/admin/stores?...` for a page of the list (also used by the server prefetch). */
export function storesPath({ status, subscriptionState, q, page }: StoresListParams): string {
  const search = new URLSearchParams({ page: String(page), pageSize: String(STORES_PAGE_SIZE) });
  if (status) search.set("status", status);
  if (subscriptionState) search.set("subscriptionState", subscriptionState);
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

/** The subscriptions page's KPI and tab counts, one per subscription state. */
export const subscriptionCountQueryKey = (state?: SubscriptionState) =>
  ["stores", "count", "subscription", state ?? "ALL"] as const;

export function subscriptionCountPath(state?: SubscriptionState): string {
  return `/admin/stores?${state ? `subscriptionState=${state}&` : ""}page=1&pageSize=1`;
}

export function fetchSubscriptionCount(state?: SubscriptionState): Promise<number> {
  return apiFetch(subscriptionCountPath(state), { schema: countSchema });
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

export const PLAN_LABELS: Record<z.infer<typeof subscriptionSchema>["plan"], string> = {
  TRIAL: "Essai",
  STANDARD: "Standard",
  PRO: "Pro",
};

/** Amounts are integer strings in the currency's smallest unit ("200000"). */
export const storeSettingsSchema = z.object({
  maxBalance: z.string(),
  validationThreshold: z.string(),
  minDeposit: z.string(),
  refundAllowed: z.boolean(),
  reservationEnabled: z.boolean(),
  terms: z.string().nullable(),
  deliveryDelayDays: z.number().int(),
});

/** `GET /admin/stores/:id`. */
export const storeDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  city: z.string(),
  phone: z.string(),
  tradeRegister: z.string(),
  status: storeStatusSchema,
  verifiedAt: z.string().nullable(),
  statusReason: z.string().nullable(),
  country: z.object({
    code: z.string(),
    name: z.string(),
    currencyCode: z.string(),
    currencySymbol: z.string(),
    decimals: z.number().int(),
  }),
  settings: storeSettingsSchema,
  managers: z.array(
    z.object({ userId: z.string(), firstName: z.string(), lastName: z.string(), phone: z.string() }),
  ),
  subscriptionState: subscriptionStateSchema,
  currentSubscription: subscriptionSchema.nullable(),
  requestedPlan: z.enum(["TRIAL", "STANDARD", "PRO"]).nullable(),
  selfRegistered: z.boolean(),
  documents: z.object({ identity: z.boolean(), tradeRegister: z.boolean() }),
  createdAt: z.string(),
});
export type StoreDetail = z.infer<typeof storeDetailSchema>;

export const storeDetailQueryKey = (id: string) => ["stores", "detail", id] as const;

export function storeDetailPath(id: string): string {
  return `/admin/stores/${encodeURIComponent(id)}`;
}

export function fetchStoreDetail(id: string): Promise<StoreDetail> {
  return apiFetch(storeDetailPath(id), { schema: storeDetailSchema });
}

/** The two registration photos; `field` is the presence flag in `documents`. */
export const STORE_DOCUMENT_KINDS = [
  { kind: "identity", field: "identity", label: "Pièce d’identité du gérant" },
  { kind: "trade-register", field: "tradeRegister", label: "Registre du commerce" },
] as const;
export type StoreDocumentKind = (typeof STORE_DOCUMENT_KINDS)[number]["kind"];

export const storeDocumentQueryKey = (id: string, kind: StoreDocumentKind) =>
  ["stores", id, "document", kind] as const;

/** Image bytes through the session (refresh queue applies); kept in memory only. */
export function fetchStoreDocument(id: string, kind: StoreDocumentKind): Promise<Blob> {
  return apiFetch<Blob>(`${storeDetailPath(id)}/documents/${kind}`, { as: "blob" });
}

/** PENDING -> VERIFIED (guard `stores.manage`). */
export function verifyStore(id: string): Promise<StoreDetail> {
  return apiFetch(`${storeDetailPath(id)}/verify`, { method: "PATCH", schema: storeDetailSchema });
}

/** VERIFIED -> SUSPENDED, with a reason kept by the API. */
export function suspendStore(id: string, reason: string): Promise<StoreDetail> {
  return apiFetch(`${storeDetailPath(id)}/suspend`, { method: "PATCH", body: { reason }, schema: storeDetailSchema });
}

/** SUSPENDED -> VERIFIED; the API clears the suspension reason. */
export function reactivateStore(id: string): Promise<StoreDetail> {
  return apiFetch(`${storeDetailPath(id)}/reactivate`, { method: "PATCH", schema: storeDetailSchema });
}

/** PENDING / VERIFIED / SUSPENDED -> CLOSED, final, with a reason. */
export function closeStore(id: string, reason: string): Promise<StoreDetail> {
  return apiFetch(`${storeDetailPath(id)}/close`, { method: "PATCH", body: { reason }, schema: storeDetailSchema });
}

export type StoreInfoChanges = Partial<Pick<StoreDetail, "name" | "address" | "city" | "phone" | "tradeRegister">>;

/** Partial correction of the store information (guard `stores.manage`). */
export function updateStore(id: string, changes: StoreInfoChanges): Promise<StoreDetail> {
  return apiFetch(storeDetailPath(id), { method: "PATCH", body: changes, schema: storeDetailSchema });
}

export type StoreSettingsChanges = Partial<{
  maxBalance: string;
  validationThreshold: string;
  minDeposit: string;
  deliveryDelayDays: number;
  terms: string | null;
}>;

/** Partial settings change (guard `store-settings.manage`); `terms: null` clears the terms. */
export function updateStoreSettings(id: string, changes: StoreSettingsChanges): Promise<StoreDetail> {
  return apiFetch(`${storeDetailPath(id)}/settings`, { method: "PATCH", body: changes, schema: storeDetailSchema });
}

export interface RegisterStoreBody {
  countryCode: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  tradeRegister: string;
  settings: {
    maxBalance: string;
    validationThreshold: string;
    minDeposit: string;
    deliveryDelayDays?: number;
    terms?: string;
  };
  manager: { firstName: string; lastName: string; phone: string };
}

/** Registers a store as PENDING with its first manager (guard `stores.manage`). */
export function registerStore(body: RegisterStoreBody): Promise<StoreDetail> {
  return apiFetch("/admin/stores", { method: "POST", body, schema: storeDetailSchema });
}

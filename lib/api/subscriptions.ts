import { z } from "zod";
import { apiFetch } from "./client";

export const PLANS = ["TRIAL", "STANDARD", "PRO"] as const;
export type Plan = (typeof PLANS)[number];

export const subscriptionStatusSchema = z.enum(["UPCOMING", "ACTIVE", "EXPIRED"]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

/** One subscription: a plan over whole days, `startsOn` and `endsOn` included (UTC). */
export const subscriptionViewSchema = z.object({
  id: z.string(),
  storeId: z.string(),
  plan: z.enum(PLANS),
  startsOn: z.string(),
  endsOn: z.string(),
  // Computed by the API each day; never derived here.
  status: subscriptionStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SubscriptionView = z.infer<typeof subscriptionViewSchema>;

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  UPCOMING: "À venir",
  ACTIVE: "Actif",
  EXPIRED: "Expiré",
};

/** Under ["stores"], next to the store's other data. */
export const storeSubscriptionsQueryKey = (storeId: string) => ["stores", "subscriptions", storeId] as const;

/** `GET /admin/stores/:id/subscriptions` (subscriptions.read), newest first. */
export function fetchStoreSubscriptions(storeId: string): Promise<SubscriptionView[]> {
  return apiFetch(`/admin/stores/${encodeURIComponent(storeId)}/subscriptions`, {
    schema: z.array(subscriptionViewSchema),
  });
}

export type SubscriptionBody = {
  plan: Plan;
  startsOn: string;
  endsOn: string;
};

/** `POST /admin/stores/:id/subscriptions` (subscriptions.manage). */
export function createSubscription(storeId: string, body: SubscriptionBody): Promise<SubscriptionView> {
  return apiFetch(`/admin/stores/${encodeURIComponent(storeId)}/subscriptions`, {
    method: "POST",
    body,
    schema: subscriptionViewSchema,
  });
}

/** `PATCH /admin/subscriptions/:id` (subscriptions.manage): only the sent fields change. */
export function updateSubscription(id: string, changes: Partial<SubscriptionBody>): Promise<SubscriptionView> {
  return apiFetch(`/admin/subscriptions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: changes,
    schema: subscriptionViewSchema,
  });
}

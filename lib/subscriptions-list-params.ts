import { SUBSCRIPTION_STATES, type StoresListParams, type SubscriptionState } from "@/lib/api/stores";
import { parseStoresListParams } from "@/lib/stores-list-params";

type Readable = { get(name: string): string | null };

export type SubscriptionsListParams = Omit<StoresListParams, "status">;

function isSubscriptionState(value: string | null): value is SubscriptionState {
  return (SUBSCRIPTION_STATES as readonly string[]).includes(value ?? "");
}

/**
 * `/subscriptions?state=ACTIVE&q=…&page=2`. Search and page follow the stores
 * list rules; an unknown state falls back to all.
 */
export function parseSubscriptionsListParams(search: Readable): SubscriptionsListParams {
  const { q, page } = parseStoresListParams(search);
  const state = search.get("state");
  return {
    ...(isSubscriptionState(state) && { subscriptionState: state }),
    ...(q && { q }),
    page,
  };
}

/** `/subscriptions?...`; page 1 and empty values are left out. */
export function subscriptionsListHref({ subscriptionState, q, page }: SubscriptionsListParams): string {
  const search = new URLSearchParams();
  if (subscriptionState) search.set("state", subscriptionState);
  if (q) search.set("q", q);
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `/subscriptions?${query}` : "/subscriptions";
}

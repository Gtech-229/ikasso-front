import type { QueryClient } from "@tanstack/react-query";
import {
  pendingStoresCountQueryKey,
  STORE_STATUSES,
  storeCountPath,
  storeCountQueryKey,
  type StoreStatus,
} from "./stores";

/**
 * The five counts of the stores page (all, then each status). PENDING reuses
 * the sidebar badge's query so both always show the same number.
 */
export const STORE_COUNT_FILTERS: readonly (StoreStatus | undefined)[] = [undefined, ...STORE_STATUSES];

export function storeCountQuery(status?: StoreStatus) {
  return {
    queryKey: status === "PENDING" ? pendingStoresCountQueryKey : storeCountQueryKey(status),
    path: storeCountPath(status),
  };
}

/**
 * After a store changes status: refresh the stores list, its counts and the
 * sidebar badge. Deliberately not the whole ["stores"] prefix, which would also
 * refetch the store detail and the private photos on screen. Every store
 * status action (verify, and feature 7 suspend / reactivate / close) uses this.
 */
export function invalidateStoreLists(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: ["stores", "list"] });
  void queryClient.invalidateQueries({ queryKey: ["stores", "count"] });
  void queryClient.invalidateQueries({ queryKey: pendingStoresCountQueryKey });
}

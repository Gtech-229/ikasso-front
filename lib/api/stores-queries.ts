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

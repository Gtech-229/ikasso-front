import { STORE_STATUSES, type StoreStatus, type StoresListParams } from "@/lib/api/stores";

/** The API refuses a search longer than this. */
export const SEARCH_MAX_LENGTH = 100;
/** The API refuses a page number above this (backend `MAX_PAGE`). */
export const MAX_PAGE = 100_000;

type Readable = { get(name: string): string | null };

function isStoreStatus(value: string | null): value is StoreStatus {
  return (STORE_STATUSES as readonly string[]).includes(value ?? "");
}

/**
 * The list state from the URL. Anything the API would refuse falls back to the
 * default (all statuses, no search, page 1) instead of failing the page.
 */
export function parseStoresListParams(search: Readable): StoresListParams {
  const status = search.get("status");
  const q = search.get("q")?.trim() ?? "";
  const page = Number(search.get("page"));
  return {
    ...(isStoreStatus(status) && { status }),
    ...(q && [...q].length <= SEARCH_MAX_LENGTH && { q }),
    // Capped at the API's maximum: a larger page then shows the "page beyond the
    // last" state with its link back to page 1, not an error retry cannot fix.
    page: Number.isInteger(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1,
  };
}

/** `/stores?...` for a list state; page 1 and empty values are left out. */
export function storesListHref({ status, q, page }: StoresListParams): string {
  const search = new URLSearchParams();
  if (status) search.set("status", status);
  if (q) search.set("q", q);
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `/stores?${query}` : "/stores";
}

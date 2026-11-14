import { z } from "zod";
import { apiFetch } from "./client";
import { paginatedSchema } from "./pagination";

export const pendingStoresCountQueryKey = ["stores", "pending-count"] as const;

// Only `total` is read: one item is the smallest page the API accepts.
const pendingPageSchema = paginatedSchema(z.unknown());

/** Stores waiting for verification (`PENDING`), for the sidebar badge. */
export async function fetchPendingStoresCount(): Promise<number> {
  const page = await apiFetch("/admin/stores?status=PENDING&page=1&pageSize=1", {
    schema: pendingPageSchema,
  });
  return page.total;
}

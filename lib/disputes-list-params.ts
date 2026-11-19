import { DISPUTE_STATUSES, type DisputesListParams, type DisputeStatus } from "@/lib/api/disputes";
import { parseStoresListParams } from "@/lib/stores-list-params";

type Readable = { get(name: string): string | null };

function isDisputeStatus(value: string | null): value is DisputeStatus {
  return (DISPUTE_STATUSES as readonly string[]).includes(value ?? "");
}

/** `/support?status=OPEN&page=2`; the page follows the stores list rule. */
export function parseDisputesListParams(search: Readable): DisputesListParams {
  const status = search.get("status");
  return {
    ...(isDisputeStatus(status) && { status }),
    page: parseStoresListParams(search).page,
  };
}

export function disputesListHref({ status, page }: DisputesListParams): string {
  const search = new URLSearchParams();
  if (status) search.set("status", status);
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `/support?${query}` : "/support";
}

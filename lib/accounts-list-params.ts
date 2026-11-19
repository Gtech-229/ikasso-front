import { ACCOUNT_STATUSES, type AccountsListParams, type AccountStatus } from "@/lib/api/accounts";
import { parseStoresListParams } from "@/lib/stores-list-params";

type Readable = { get(name: string): string | null };

function isAccountStatus(value: string | null): value is AccountStatus {
  return (ACCOUNT_STATUSES as readonly string[]).includes(value ?? "");
}

/** `/accounts?status=SUSPENDED&q=keita&page=2`; search and page follow the stores list rules. */
export function parseAccountsListParams(search: Readable): AccountsListParams {
  const { q, page } = parseStoresListParams(search);
  const status = search.get("status");
  return {
    ...(isAccountStatus(status) && { status }),
    ...(q && { q }),
    page,
  };
}

/** `/accounts?...`; page 1 and empty values are left out. */
export function accountsListHref({ status, q, page }: AccountsListParams): string {
  const search = new URLSearchParams();
  if (status) search.set("status", status);
  if (q) search.set("q", q);
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `/accounts?${query}` : "/accounts";
}

import { z } from "zod";
import { apiFetch } from "./client";
import { paginatedSchema } from "./pagination";

export const ACCOUNT_STATUSES = ["ACTIVE", "SUSPENDED"] as const;
export const accountStatusSchema = z.enum(ACCOUNT_STATUSES);
export type AccountStatus = z.infer<typeof accountStatusSchema>;

/** `GET /admin/accounts` item: enough to find an account, never its balance or operations. */
export const accountSchema = z.object({
  id: z.string(),
  number: z.string(),
  store: z.object({ id: z.string(), name: z.string() }),
  customer: z.object({ id: z.string(), firstName: z.string(), lastName: z.string(), phone: z.string() }),
  status: accountStatusSchema,
  // The current suspension's reason; null when active.
  statusReason: z.string().nullable(),
  statusChangedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Account = z.infer<typeof accountSchema>;

export const accountsPageSchema = paginatedSchema(accountSchema);
export const accountCountSchema = accountsPageSchema.transform((page) => page.total);

export const ACCOUNTS_PAGE_SIZE = 20;

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
};

export interface AccountsListParams {
  status?: AccountStatus;
  q?: string;
  page: number;
}

export const accountsQueryKey = ({ status, q, page }: AccountsListParams) =>
  ["accounts", "list", { status: status ?? null, q: q ?? null, page }] as const;

export function accountsPath({ status, q, page }: AccountsListParams, pageSize = ACCOUNTS_PAGE_SIZE): string {
  const search = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) search.set("status", status);
  if (q) search.set("q", q);
  return `/admin/accounts?${search}`;
}

export function fetchAccounts(params: AccountsListParams) {
  return apiFetch(accountsPath(params), { schema: accountsPageSchema });
}

/** The status pill counts follow the current search. */
export const accountCountQueryKey = (status?: AccountStatus, q?: string) =>
  ["accounts", "count", status ?? "ALL", q ?? null] as const;

export const accountCountPath = (status?: AccountStatus, q?: string) => accountsPath({ status, q, page: 1 }, 1);

export function fetchAccountCount(status?: AccountStatus, q?: string): Promise<number> {
  return apiFetch(accountCountPath(status, q), { schema: accountCountSchema });
}

const accountPath = (id: string) => `/admin/accounts/${encodeURIComponent(id)}`;

/** `PATCH /admin/accounts/:id/suspend` (accounts.manage): ACTIVE -> SUSPENDED with a reason. */
export function suspendAccount(id: string, reason: string): Promise<Account> {
  return apiFetch(`${accountPath(id)}/suspend`, { method: "PATCH", body: { reason }, schema: accountSchema });
}

/** `PATCH /admin/accounts/:id/reactivate` (accounts.manage): SUSPENDED -> ACTIVE, reason cleared. */
export function reactivateAccount(id: string): Promise<Account> {
  return apiFetch(`${accountPath(id)}/reactivate`, { method: "PATCH", schema: accountSchema });
}

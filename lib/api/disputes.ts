import { z } from "zod";
import { apiFetch } from "./client";
import { paginatedSchema } from "./pagination";

export const DISPUTE_STATUSES = ["OPEN", "ANSWERED"] as const;
export const disputeStatusSchema = z.enum(DISPUTE_STATUSES);
export type DisputeStatus = z.infer<typeof disputeStatusSchema>;

const person = z.object({ firstName: z.string(), lastName: z.string() });

export const operationTypeSchema = z.enum(["DEPOSIT", "MATERIAL_DEBIT", "CORRECTION", "REFUND"]);
export type OperationType = z.infer<typeof operationTypeSchema>;

/** A dispute still awaiting an answer, with its thread (`GET /admin/disputes`). */
export const disputeSchema = z.object({
  id: z.string(),
  status: disputeStatusSchema,
  operation: z.object({
    id: z.string(),
    reference: z.string(),
    type: operationTypeSchema,
    direction: z.enum(["CREDIT", "DEBIT"]),
    // Integer string in the smallest unit, always > 0: `direction` gives the sign.
    amount: z.string(),
    currencyCode: z.string(),
    createdAt: z.string(),
  }),
  account: z.object({ id: z.string(), number: z.string() }),
  store: z.object({ id: z.string(), name: z.string() }),
  customer: person,
  // Oldest first.
  messages: z.array(
    z.object({
      author: z.enum(["CUSTOMER", "STORE"]),
      authorName: person,
      body: z.string(),
      createdAt: z.string(),
    }),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Dispute = z.infer<typeof disputeSchema>;

export const disputesPageSchema = paginatedSchema(disputeSchema);

export const DISPUTES_PAGE_SIZE = 20;

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  OPEN: "En attente de la quincaillerie",
  ANSWERED: "En attente du client",
};

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  DEPOSIT: "Dépôt",
  MATERIAL_DEBIT: "Retrait de matériaux",
  CORRECTION: "Correction",
  REFUND: "Remboursement",
};

export interface DisputesListParams {
  status?: DisputeStatus;
  page: number;
}

export const disputesQueryKey = ({ status, page }: DisputesListParams) =>
  ["disputes", "list", { status: status ?? null, page }] as const;

export function disputesPath({ status, page }: DisputesListParams, pageSize = DISPUTES_PAGE_SIZE): string {
  const search = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) search.set("status", status);
  return `/admin/disputes?${search}`;
}

export function fetchDisputes(params: DisputesListParams) {
  return apiFetch(disputesPath(params), { schema: disputesPageSchema });
}

/** The filter pill counts: all, then each status. */
export const disputeCountQueryKey = (status?: DisputeStatus) => ["disputes", "count", status ?? "ALL"] as const;

export const disputeCountPath = (status?: DisputeStatus) => disputesPath({ status, page: 1 }, 1);

export const disputeCountSchema = disputesPageSchema.transform((page) => page.total);

export function fetchDisputeCount(status?: DisputeStatus): Promise<number> {
  return apiFetch(disputeCountPath(status), { schema: disputeCountSchema });
}

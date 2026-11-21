import { z } from "zod";
import type { BulkStoreAction, StoreStatus, StoreSummary } from "@/lib/api/stores";

export type StoreAction = "suspend" | "reactivate" | "close";

/** What an admin may do to a store in each status (mirrors the API's transitions). */
export const STORE_ACTIONS: Record<StoreStatus, readonly StoreAction[]> = {
  PENDING: ["close"],
  VERIFIED: ["suspend", "close"],
  SUSPENDED: ["reactivate", "close"],
  CLOSED: [],
};

export const REASON_MIN = 3;
export const REASON_MAX = 500;
const REASON_MESSAGE = "Le motif doit contenir 3 à 500 caractères";

/** Same rule and message as the API (trimmed, 3 to 500 characters). */
export const reasonSchema = z
  .string()
  .trim()
  .min(REASON_MIN, { error: REASON_MESSAGE })
  .max(REASON_MAX, { error: REASON_MESSAGE });

/** Statuses each group action applies to (the API's transitions). */
const BULK_FROM: Record<BulkStoreAction, readonly StoreStatus[]> = {
  verify: ["PENDING"],
  suspend: ["VERIFIED"],
  reactivate: ["SUSPENDED"],
  close: ["PENDING", "VERIFIED", "SUSPENDED"],
};
const BULK_ORDER: readonly BulkStoreAction[] = ["verify", "suspend", "reactivate", "close"];

/**
 * The group actions valid for every selected store, and how many selected
 * PENDING files are incomplete (group verify needs complete files only).
 */
export function bulkActionsFor(stores: readonly StoreSummary[]): {
  actions: BulkStoreAction[];
  incomplete: number;
} {
  const incomplete = stores.filter((store) => store.status === "PENDING" && !store.documentsComplete).length;
  if (stores.length === 0) return { actions: [], incomplete };
  const actions = BULK_ORDER.filter(
    (action) =>
      stores.every((store) => BULK_FROM[action].includes(store.status)) &&
      (action !== "verify" || incomplete === 0),
  );
  return { actions, incomplete };
}

/** What each status action does, shown in its confirmation (single and group). */
export const STORE_ACTION_CONSEQUENCES: Record<StoreAction, string> = {
  suspend: "Elle ne pourra plus enregistrer de dépôts ; ses clients pourront toujours être servis.",
  reactivate: "Le motif de suspension sera effacé.",
  close: "Définitif : la quincaillerie ne pourra plus être modifiée ni rouverte. Son historique est conservé.",
};

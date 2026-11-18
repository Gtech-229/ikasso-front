import { z } from "zod";
import type { StoreStatus } from "@/lib/api/stores";

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

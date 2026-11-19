import { ACTIVITY_ACTIONS, type ActivityAction, type ActivityListParams } from "@/lib/api/activity";
import { parseStoresListParams } from "@/lib/stores-list-params";
import { isDay } from "@/lib/subscription-form";

type Readable = { get(name: string): string | null };

/** The API's INVALID_PERIOD message, shown on "Au" before any request. */
export const PERIOD_ERROR = "Le dernier jour doit être le même que le premier ou après";

/** The API's `@IsUUID("all")`: version 1-8 and variant 8/9/a/b, or the nil or max UUID. */
const UUID_PATTERN =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;

function isAction(value: string | null): value is ActivityAction {
  return (ACTIVITY_ACTIONS as readonly string[]).includes(value ?? "");
}

/** Days compare as text in `YYYY-MM-DD`. */
export function isPeriodValid(from: string | undefined, to: string | undefined): boolean {
  return !from || !to || to >= from;
}

/**
 * `/activity?storeId=…&action=…&from=…&to=…&page=2`. Anything the API would
 * refuse falls back to no filter (an inverted period drops both days).
 */
export function parseActivityParams(search: Readable): ActivityListParams {
  const storeId = search.get("storeId")?.trim().toLowerCase() ?? "";
  const action = search.get("action");
  const from = search.get("from") ?? "";
  const to = search.get("to") ?? "";
  const fromOk = isDay(from);
  const toOk = isDay(to);
  const periodOk = isPeriodValid(fromOk ? from : undefined, toOk ? to : undefined);
  return {
    ...(UUID_PATTERN.test(storeId) && { storeId }),
    ...(isAction(action) && { action }),
    ...(fromOk && periodOk && { from }),
    ...(toOk && periodOk && { to }),
    page: parseStoresListParams(search).page,
  };
}

/** `/activity?...`; page 1 and empty values are left out. */
export function activityHref({ storeId, action, from, to, page }: ActivityListParams): string {
  const search = new URLSearchParams();
  if (storeId) search.set("storeId", storeId);
  if (action) search.set("action", action);
  if (from) search.set("from", from);
  if (to) search.set("to", to);
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `/activity?${query}` : "/activity";
}

export function hasActivityFilters({ storeId, action, from, to }: ActivityListParams): boolean {
  return Boolean(storeId || action || from || to);
}

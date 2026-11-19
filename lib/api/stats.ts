import { z } from "zod";
import { apiFetch } from "./client";

const count = z.number().int().nonnegative();

/** One block of counts, for the platform or one country. Counts only, never amounts. */
const figuresSchema = z.object({
  stores: z.object({
    // À ce jour (independent of the period).
    byStatus: z.object({ PENDING: count, VERIFIED: count, SUSPENDED: count, CLOSED: count }),
    bySubscription: z.object({ ACTIVE: count, UPCOMING: count, EXPIRED: count, NONE: count }),
    // Sur la période.
    registered: count,
  }),
  accounts: z.object({
    total: count,
    suspended: count,
    opened: count,
    active: count,
  }),
  trust: z.object({
    disputesOpened: count,
    // À ce jour.
    disputesUnresolved: count,
    corrections: count,
    ordersRefused: count,
    closingsWithDiscrepancy: count,
  }),
});
export type Figures = z.infer<typeof figuresSchema>;

/** `GET /admin/stats?from&to` (stats.read): days in UTC, both included, 366 at most. */
export const platformStatsSchema = z.object({
  period: z.object({ from: z.string(), to: z.string() }),
  platform: figuresSchema,
  countries: z.array(figuresSchema.extend({ countryCode: z.string(), name: z.string() })),
});
export type PlatformStats = z.infer<typeof platformStatsSchema>;

export const statsQueryKey = (from: string, to: string) => ["stats", from, to] as const;

export function statsPath(from: string, to: string): string {
  return `/admin/stats?${new URLSearchParams({ from, to })}`;
}

export function fetchStats(from: string, to: string): Promise<PlatformStats> {
  return apiFetch(statsPath(from, to), { schema: platformStatsSchema });
}

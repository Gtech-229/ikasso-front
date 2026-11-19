type Readable = { get(name: string): string | null };

/** The period switch: whole days ending today (UTC), both ends included. */
export const STATS_PERIODS = [
  { days: 30, label: "30 jours" },
  { days: 90, label: "90 jours" },
  // 366 days (today − 365 … today): the API's maximum, so a leap year fits.
  { days: 365, label: "12 mois" },
] as const;

export type StatsPeriod = (typeof STATS_PERIODS)[number]["days"];

const DEFAULT_PERIOD: StatsPeriod = 30;

/** `?period=30|90|365`; anything else is the default (30 days). */
export function parseStatsPeriod(search: Readable): StatsPeriod {
  const value = Number(search.get("period"));
  return STATS_PERIODS.find((period) => period.days === value)?.days ?? DEFAULT_PERIOD;
}

export function statsHref(period: StatsPeriod): string {
  return period === DEFAULT_PERIOD ? "/stats" : `/stats?period=${period}`;
}

/** Today's UTC day, `YYYY-MM-DD`: the API's clock for periods. */
export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The `from` / `to` days of a period ending on `today`. 30 and 90 cover that
 * many days; 365 ("12 mois") covers 366, today included.
 */
export function statsPeriodRange(period: StatsPeriod, today: string): { from: string; to: string } {
  const end = new Date(`${today}T00:00:00.000Z`);
  if (Number.isNaN(end.getTime())) throw new Error(`Jour invalide : ${JSON.stringify(today)}`);
  const back = period === 365 ? 365 : period - 1;
  return { from: todayUtc(new Date(end.getTime() - back * DAY_MS)), to: today };
}

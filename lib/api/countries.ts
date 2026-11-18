import { z } from "zod";
import { apiFetch } from "./client";

/** `GET /admin/countries` (guard `countries.read`): every country, sorted by code. */
export const countrySchema = z.object({
  code: z.string(),
  name: z.string(),
  phonePrefix: z.string(),
  currencyCode: z.string(),
  currencySymbol: z.string(),
  decimals: z.number().int(),
  active: z.boolean(),
});
export type Country = z.infer<typeof countrySchema>;

export const countriesQueryKey = ["countries"] as const;

export function fetchCountries(): Promise<Country[]> {
  return apiFetch("/admin/countries", { schema: z.array(countrySchema) });
}

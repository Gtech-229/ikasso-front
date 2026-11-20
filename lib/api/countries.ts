import { z } from "zod";
import { apiFetch } from "./client";

export const COUNTRY_LANGUAGES = ["fr", "en"] as const;
export type CountryLanguage = (typeof COUNTRY_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<CountryLanguage, string> = { fr: "Français", en: "Anglais" };

/** `GET /admin/countries` (guard `countries.read`): every country, sorted by code. */
export const countrySchema = z.object({
  code: z.string(),
  name: z.string(),
  // Set by the API from the code, e.g. "+223".
  phonePrefix: z.string(),
  currencyCode: z.string(),
  currencySymbol: z.string(),
  decimals: z.number().int(),
  language: z.enum(COUNTRY_LANGUAGES),
  active: z.boolean(),
});
export type Country = z.infer<typeof countrySchema>;

export const countriesQueryKey = ["countries"] as const;

export const COUNTRIES_PATH = "/admin/countries";

export function fetchCountries(): Promise<Country[]> {
  return apiFetch(COUNTRIES_PATH, { schema: z.array(countrySchema) });
}

export type CountryBody = {
  code: string;
  name: string;
  currencyCode: string;
  currencySymbol: string;
  decimals: number;
  language: CountryLanguage;
};

const countryPath = (code: string) => `${COUNTRIES_PATH}/${encodeURIComponent(code)}`;

/** `POST /admin/countries` (countries.manage): a new, inactive country. */
export function createCountry(body: CountryBody): Promise<Country> {
  return apiFetch(COUNTRIES_PATH, { method: "POST", body, schema: countrySchema });
}

/** `PATCH /admin/countries/:code`: only the sent fields change; the code never does. */
export function updateCountry(code: string, changes: Partial<Omit<CountryBody, "code">>): Promise<Country> {
  return apiFetch(countryPath(code), { method: "PATCH", body: changes, schema: countrySchema });
}

/** `PATCH /admin/countries/:code/activate`: refused while another country is active. */
export function activateCountry(code: string): Promise<Country> {
  return apiFetch(`${countryPath(code)}/activate`, { method: "PATCH", schema: countrySchema });
}

/** `PATCH /admin/countries/:code/deactivate`: refused while a store is not closed. */
export function deactivateCountry(code: string): Promise<Country> {
  return apiFetch(`${countryPath(code)}/deactivate`, { method: "PATCH", schema: countrySchema });
}

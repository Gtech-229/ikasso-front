import { z } from "zod";
import { COUNTRY_LANGUAGES, type Country, type CountryBody } from "@/lib/api/countries";
import { changedFields } from "@/lib/store-forms";

// The API's messages (CreateCountryDto); ISO validity itself is checked by the API.
const CODE_MESSAGE = "Le code pays doit être un code ISO à 2 lettres (ex. ML)";
const NAME_MESSAGE = "Le nom du pays doit contenir 1 à 100 caractères";
const CURRENCY_MESSAGE = "Le code devise doit être un code ISO 4217 valide (ex. XOF)";
const SYMBOL_MESSAGE = "Le symbole de la devise doit contenir 1 à 10 caractères";
const DECIMALS_MESSAGE = "Le nombre de décimales doit être un entier entre 0 et 3";

/** Text values (inputs); `countryBody` turns them into the API's types. */
export const countryFormSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, CODE_MESSAGE),
  name: z.string().trim().min(1, NAME_MESSAGE).max(100, NAME_MESSAGE),
  currencyCode: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, CURRENCY_MESSAGE),
  currencySymbol: z.string().trim().min(1, SYMBOL_MESSAGE).max(10, SYMBOL_MESSAGE),
  decimals: z.string().trim().regex(/^[0-3]$/, DECIMALS_MESSAGE),
  language: z.enum(COUNTRY_LANGUAGES),
});

export type CountryFormInput = z.input<typeof countryFormSchema>;
export type CountryFormValues = z.output<typeof countryFormSchema>;

export const EMPTY_COUNTRY_FORM: CountryFormInput = {
  code: "",
  name: "",
  currencyCode: "",
  currencySymbol: "",
  decimals: "",
  language: "fr",
};

export function countryFormValues(country: Country): CountryFormInput {
  return {
    code: country.code,
    name: country.name,
    currencyCode: country.currencyCode,
    currencySymbol: country.currencySymbol,
    decimals: String(country.decimals),
    language: country.language,
  };
}

export function countryBody(values: CountryFormValues): CountryBody {
  return { ...values, decimals: Number(values.decimals) };
}

/** The edit body: only what differs from the country the dialog opened with (never the code). */
export function countryChanges(initial: Country, values: CountryFormValues): Partial<Omit<CountryBody, "code">> {
  const editable = (body: CountryBody): Omit<CountryBody, "code"> => ({
    name: body.name,
    currencyCode: body.currencyCode,
    currencySymbol: body.currencySymbol,
    decimals: body.decimals,
    language: body.language,
  });
  return changedFields(
    editable(countryBody(countryFormSchema.parse(countryFormValues(initial)))),
    editable(countryBody(values)),
  );
}

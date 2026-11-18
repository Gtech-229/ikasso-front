import { z } from "zod";
import type { RegisterStoreBody, StoreSettingsChanges } from "@/lib/api/stores";
import { compareAmounts, toMinorUnits } from "@/lib/money-input";

// Rules and messages mirror the API (backend src/stores/dto/register-store.dto.ts
// and src/common/money.ts); the API still validates every request.

const text = (min: number, max: number, message: string) =>
  z.string().trim().min(min, { error: message }).max(max, { error: message });

export const storeInfoSchema = z.object({
  name: text(1, 150, "Le nom doit contenir 1 à 150 caractères"),
  address: text(1, 300, "L’adresse doit contenir 1 à 300 caractères"),
  city: text(1, 100, "La ville doit contenir 1 à 100 caractères"),
  phone: text(2, 30, "Le numéro de téléphone est invalide"),
  tradeRegister: text(1, 100, "Le registre du commerce doit contenir 1 à 100 caractères"),
});
export type StoreInfoValues = z.infer<typeof storeInfoSchema>;

export const AMOUNT_RULE_MESSAGE =
  "Le montant doit être un entier positif écrit en chiffres, sans décimales (ex. \"200000\")";
export const MIN_DEPOSIT_ABOVE_MAX_BALANCE = "Le dépôt minimum ne peut pas dépasser le solde maximal";
const DELIVERY_DELAY_MESSAGE = "Le délai de livraison doit être un nombre entier de jours, de 1 à 365";
export const TERMS_MAX = 10_000;

/**
 * The API's message describes its own format (no decimals). It also fits the
 * form for 0-decimal currencies (XOF); with decimals the form accepts "12,50",
 * so it says how many decimals are allowed instead.
 */
export function amountMessage(decimals: number): string {
  if (decimals === 0) return AMOUNT_RULE_MESSAGE;
  const example = `12,${"5".padEnd(decimals, "0")}`;
  return `Le montant doit être positif, avec au plus ${decimals} décimale${decimals > 1 ? "s" : ""} (ex. "${example}")`;
}

/**
 * Form values are the typed text; `decimals` is the store currency's.
 * `optionalDelay`: at registration an empty delay is allowed (the API then uses
 * its default of 30 days); when editing, the field always has a value.
 */
export function storeSettingsFormSchema(decimals: number, { optionalDelay = false } = {}) {
  const amount = z
    .string()
    .refine((value) => toMinorUnits(value, decimals) !== null, { error: amountMessage(decimals) });
  return z
    .object({
      maxBalance: amount,
      validationThreshold: amount,
      minDeposit: amount,
      deliveryDelayDays: z
        .string()
        .trim()
        .refine(
          (value) =>
            (optionalDelay && value === "") ||
            (/^\d{1,3}$/.test(value) && Number(value) >= 1 && Number(value) <= 365),
          { error: DELIVERY_DELAY_MESSAGE },
        ),
      terms: z
        .string()
        .refine((value) => value.trim().length <= TERMS_MAX, {
          error: "Les conditions générales dépassent 10 000 caractères",
        }),
    })
    .superRefine((values, ctx) => {
      const min = toMinorUnits(values.minDeposit, decimals);
      const max = toMinorUnits(values.maxBalance, decimals);
      if (min && max && compareAmounts(min, max) > 0) {
        ctx.addIssue({ code: "custom", path: ["minDeposit"], message: MIN_DEPOSIT_ABOVE_MAX_BALANCE });
      }
    });
}
export type StoreSettingsFormValues = z.infer<ReturnType<typeof storeSettingsFormSchema>>;

/** Keys whose value changed; strings compared trimmed. */
export function changedFields<T extends Record<string, unknown>>(initial: T, values: T): Partial<T> {
  const changes: Partial<T> = {};
  for (const key of Object.keys(values) as (keyof T)[]) {
    const before = initial[key];
    const after = values[key];
    const same =
      typeof before === "string" && typeof after === "string" ? before.trim() === after.trim() : before === after;
    if (!same) changes[key] = after;
  }
  return changes;
}

/** The settings form's text values for a store's current settings. */
export function settingsFormValues(
  settings: { maxBalance: string; validationThreshold: string; minDeposit: string; deliveryDelayDays: number; terms: string | null },
  decimals: number,
  fromMinor: (amount: string, decimals: number) => string,
): StoreSettingsFormValues {
  return {
    maxBalance: fromMinor(settings.maxBalance, decimals),
    validationThreshold: fromMinor(settings.validationThreshold, decimals),
    minDeposit: fromMinor(settings.minDeposit, decimals),
    deliveryDelayDays: String(settings.deliveryDelayDays),
    terms: settings.terms ?? "",
  };
}

/**
 * The API body for the edited settings: only changed fields, amounts in the
 * smallest unit, the delay as a number, and cleared terms as null.
 */
export function settingsChanges(
  initial: StoreSettingsFormValues,
  values: StoreSettingsFormValues,
  decimals: number,
): StoreSettingsChanges {
  const changed = changedFields(initial, values);
  const body: StoreSettingsChanges = {};
  for (const key of ["maxBalance", "validationThreshold", "minDeposit"] as const) {
    const value = changed[key];
    if (value !== undefined) body[key] = toMinorUnits(value, decimals) ?? value;
  }
  if (changed.deliveryDelayDays !== undefined) body.deliveryDelayDays = Number(changed.deliveryDelayDays.trim());
  if (changed.terms !== undefined) body.terms = changed.terms.trim() || null;
  return body;
}

export const storeManagerSchema = z.object({
  firstName: text(1, 100, "Le prénom doit contenir 1 à 100 caractères"),
  lastName: text(1, 100, "Le nom doit contenir 1 à 100 caractères"),
  phone: text(2, 30, "Le numéro de téléphone est invalide"),
});

/**
 * Registration form. Field names nest like the API's `details` paths
 * (`settings.minDeposit`, `manager.phone`); the store fields sit under `store`
 * in the form and at the top level of the API body.
 */
export function registerStoreFormSchema(decimals: number) {
  return z.object({
    store: storeInfoSchema,
    manager: storeManagerSchema,
    settings: storeSettingsFormSchema(decimals, { optionalDelay: true }),
  });
}
export type RegisterStoreFormValues = z.infer<ReturnType<typeof registerStoreFormSchema>>;

/** The API body: amounts in the smallest unit, empty delay and terms left out. */
export function registerStoreBody(
  values: RegisterStoreFormValues,
  countryCode: string,
  decimals: number,
): RegisterStoreBody {
  const amount = (typed: string) => toMinorUnits(typed, decimals) ?? typed.trim();
  const delay = values.settings.deliveryDelayDays.trim();
  const terms = values.settings.terms.trim();
  return {
    countryCode,
    name: values.store.name.trim(),
    address: values.store.address.trim(),
    city: values.store.city.trim(),
    phone: values.store.phone.trim(),
    tradeRegister: values.store.tradeRegister.trim(),
    settings: {
      maxBalance: amount(values.settings.maxBalance),
      validationThreshold: amount(values.settings.validationThreshold),
      minDeposit: amount(values.settings.minDeposit),
      ...(delay && { deliveryDelayDays: Number(delay) }),
      ...(terms && { terms }),
    },
    manager: {
      firstName: values.manager.firstName.trim(),
      lastName: values.manager.lastName.trim(),
      phone: values.manager.phone.trim(),
    },
  };
}

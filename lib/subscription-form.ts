import { z } from "zod";
import { PLANS, type SubscriptionBody, type SubscriptionView } from "@/lib/api/subscriptions";
import { changedFields } from "@/lib/store-forms";

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** The API's message for an end before the start (INVALID_SUBSCRIPTION_PERIOD). */
export const PERIOD_MESSAGE = "La date de fin doit être le même jour que la date de début ou après";

/**
 * A real calendar day as `YYYY-MM-DD` (what `<input type="date">` gives),
 * year 0001 to 9999 like the API's `@IsDay` (JavaScript has a year 0,
 * PostgreSQL does not).
 */
export function isDay(value: string): boolean {
  if (!DAY_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() >= 1 &&
    date.toISOString().slice(0, 10) === value
  );
}

const day = (required: string) =>
  z.string().min(1, required).refine(isDay, "Date invalide");

export const subscriptionFormSchema = z
  .object({
    // "" until a plan is picked: the form proposes no default.
    plan: z.union([z.enum(PLANS), z.literal("")]).refine((plan) => plan !== "", "Choisissez une formule"),
    startsOn: day("Indiquez le premier jour"),
    endsOn: day("Indiquez le dernier jour"),
  })
  .superRefine((values, ctx) => {
    // Days compare as text in YYYY-MM-DD.
    if (isDay(values.startsOn) && isDay(values.endsOn) && values.endsOn < values.startsOn) {
      ctx.addIssue({ code: "custom", path: ["endsOn"], message: PERIOD_MESSAGE });
    }
  });

export type SubscriptionFormValues = z.input<typeof subscriptionFormSchema>;

export const EMPTY_SUBSCRIPTION_FORM: SubscriptionFormValues = { plan: "", startsOn: "", endsOn: "" };

export function subscriptionFormValues(subscription: SubscriptionView): SubscriptionFormValues {
  return { plan: subscription.plan, startsOn: subscription.startsOn, endsOn: subscription.endsOn };
}

/** The request body of a valid form (plan is set once the schema passed). */
export function subscriptionBody(values: SubscriptionFormValues): SubscriptionBody {
  if (values.plan === "") throw new Error("Formule manquante");
  return { plan: values.plan, startsOn: values.startsOn, endsOn: values.endsOn };
}

/** Only the fields that differ from the values the form opened with. */
export function subscriptionChanges(
  initial: SubscriptionFormValues,
  values: SubscriptionFormValues,
): Partial<SubscriptionBody> {
  return changedFields(subscriptionBody(initial), subscriptionBody(values));
}

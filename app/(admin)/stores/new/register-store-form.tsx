"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useFormState, useWatch, type Path } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { countriesQueryKey, fetchCountries, type Country } from "@/lib/api/countries";
import { isApiError, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import { registerStore, storeDetailQueryKey } from "@/lib/api/stores";
import { invalidateStoreLists } from "@/lib/api/stores-queries";
import { formatMoney } from "@/lib/format";
import { toMinorUnits } from "@/lib/money-input";
import {
  registerStoreBody,
  registerStoreFormSchema,
  TERMS_MAX,
  type RegisterStoreFormValues,
} from "@/lib/store-forms";
import { cn } from "@/lib/utils";
import { SaveAlert, showSaveError } from "../edit-support";

type FormPath = Path<RegisterStoreFormValues>;
type FieldSpec = { name: FormPath; label: string };

const STORE_FIELDS: FieldSpec[] = [
  { name: "store.name", label: "Nom" },
  { name: "store.address", label: "Adresse" },
  { name: "store.city", label: "Ville" },
  { name: "store.phone", label: "Téléphone" },
  { name: "store.tradeRegister", label: "Registre du commerce" },
];
const MANAGER_FIELDS: FieldSpec[] = [
  { name: "manager.firstName", label: "Prénom" },
  { name: "manager.lastName", label: "Nom" },
  { name: "manager.phone", label: "Téléphone" },
];
const AMOUNT_FIELDS: FieldSpec[] = [
  { name: "settings.maxBalance", label: "Solde maximum" },
  { name: "settings.validationThreshold", label: "Seuil de validation" },
  { name: "settings.minDeposit", label: "Dépôt minimum" },
];
const SETTINGS_FIELDS: FormPath[] = [
  ...AMOUNT_FIELDS.map((field) => field.name),
  "settings.deliveryDelayDays",
  "settings.terms",
];

// Steps in order (user revision: a multi-step form). Each data step lists the
// fields "Suivant" validates; the last step is a recap before sending.
const STEPS = [
  { title: "Pays", fields: [] as FormPath[] },
  { title: "Quincaillerie", fields: STORE_FIELDS.map((field) => field.name) },
  { title: "Gérant", fields: MANAGER_FIELDS.map((field) => field.name) },
  { title: "Paramètres", fields: SETTINGS_FIELDS },
  { title: "Récapitulatif", fields: [] as FormPath[] },
] as const;
const LAST = STEPS.length - 1;
const ALL_FIELDS: FormPath[] = STEPS.flatMap((step) => step.fields);
const stepOf = (field: string) => STEPS.findIndex((step) => (step.fields as string[]).includes(field));

// The API reports store fields at the top level (`phone`), the form nests them.
const STORE_KEYS = new Set(["name", "address", "city", "phone", "tradeRegister"]);
const toFormField = (apiField: string) => (STORE_KEYS.has(apiField) ? `store.${apiField}` : apiField);

const EMPTY: RegisterStoreFormValues = {
  store: { name: "", address: "", city: "", phone: "", tradeRegister: "" },
  manager: { firstName: "", lastName: "", phone: "" },
  settings: { maxBalance: "", validationThreshold: "", minDeposit: "", deliveryDelayDays: "", terms: "" },
};

const fieldId = (name: string) => `register-${name.replace(".", "-")}`;
const HEADING_ID = "register-step-title";

export function RegisterStoreForm() {
  const countries = useQuery({
    queryKey: countriesQueryKey,
    queryFn: fetchCountries,
    meta: { inlineError: true },
  });

  if (countries.isPending) return <Skeleton className="h-96 max-w-3xl rounded-card" />;
  if (countries.isError) {
    return (
      <div role="alert" className="flex max-w-3xl flex-col items-start gap-3 rounded-card bg-surface p-6">
        <p className="text-[15px] text-danger">
          {isApiError(countries.error) ? countries.error.message : UNEXPECTED_ERROR_MESSAGE}
        </p>
        <Button variant="secondary" onClick={() => countries.refetch()}>
          Réessayer
        </Button>
      </div>
    );
  }

  const active = countries.data.filter((country) => country.active);
  if (active.length === 0) {
    return (
      <p role="status" className="max-w-3xl rounded-card bg-surface p-6 text-[15px] text-muted-ink">
        Aucun pays n’est actif : activez un pays avant d’inscrire une quincaillerie.
      </p>
    );
  }
  return <RegisterForm countries={active} onCountryRefused={() => void countries.refetch()} />;
}

function RegisterForm({ countries, onCountryRefused }: { countries: Country[]; onCountryRefused: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  // V1 has a single active country: preselected.
  const [countryCode, setCountryCode] = useState(countries[0].code);
  const country = countries.find((item) => item.code === countryCode) ?? countries[0];

  const form = useForm<RegisterStoreFormValues>({
    resolver: zodResolver(registerStoreFormSchema(country.decimals)),
    defaultValues: EMPTY,
  });
  // The current step and, after an error, the field to focus on it. `seq`
  // changes on every navigation so the focus effect runs each time.
  const [nav, setNav] = useState<{ step: number; focus: FormPath | null; seq: number }>({
    step: 0,
    focus: null,
    seq: 0,
  });
  const step = nav.step;
  // Highest step reached with valid data: earlier steps can be revisited.
  const [reached, setReached] = useState(0);
  const [alert, setAlert] = useState<string | null>(null);

  // Each navigation moves focus to the step heading, or to a refused field.
  useEffect(() => {
    if (nav.seq === 0) return; // not on first display
    if (nav.focus) form.setFocus(nav.focus);
    else document.getElementById(HEADING_ID)?.focus();
  }, [nav, form]);

  function goTo(target: number, focus: FormPath | null = null) {
    setNav((current) => ({ step: target, focus, seq: current.seq + 1 }));
  }

  const mutation = useMutation({
    mutationFn: (values: RegisterStoreFormValues) =>
      registerStore(registerStoreBody(values, country.code, country.decimals)),
    onSuccess: (store) => {
      queryClient.setQueryData(storeDetailQueryKey(store.id), store);
      invalidateStoreLists(queryClient);
      toast.success("Quincaillerie inscrite.");
      router.push(`/stores/${store.id}`);
    },
    onError: (error) => {
      // Unknown or no longer active country: say so, reload the list, back to step 1.
      if (isApiError(error) && (error.error === "COUNTRY_INACTIVE" || error.statusCode === 404)) {
        setAlert(error.message);
        onCountryRefused();
        goTo(0);
        return;
      }
      const message = showSaveError(error, form, ALL_FIELDS, toFormField);
      setAlert(message);
      // Show the step of the first field the API refused.
      const refused = ALL_FIELDS.find((name) => form.getFieldState(name).error);
      if (refused) goTo(stepOf(refused), refused);
    },
  });

  async function next() {
    const valid = await form.trigger(STEPS[step].fields as FormPath[], { shouldFocus: true });
    if (!valid) return;
    const target = step + 1;
    setReached((current) => Math.max(current, target));
    goTo(target);
  }

  const busy = mutation.isPending || mutation.isSuccess;

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Stepper step={step} reached={reached} onSelect={goTo} />

      <form
        noValidate
        className="flex flex-col gap-5 rounded-card bg-surface p-6"
        onSubmit={form.handleSubmit(
          (values) => {
            setAlert(null);
            mutation.mutate(values);
          },
          // A client error on submit: show the step holding the first one.
          (errors) => {
            const refused = ALL_FIELDS.find((name) => {
              const [group, key] = name.split(".") as [keyof RegisterStoreFormValues, string];
              return (errors[group] as Record<string, unknown> | undefined)?.[key];
            });
            if (refused) goTo(stepOf(refused), refused);
          },
        )}
        onKeyDown={(event) => {
          // Enter in a field goes to the next step instead of submitting early.
          if (event.key === "Enter" && step < LAST && (event.target as HTMLElement).tagName === "INPUT") {
            event.preventDefault();
            void next();
          }
        }}
      >
        <h2 id={HEADING_ID} tabIndex={-1} className="font-display text-[22px] font-bold outline-none">
          <span className="text-muted-ink">
            Étape {step + 1} sur {STEPS.length} ·{" "}
          </span>
          {STEPS[step].title}
        </h2>

        {step === 0 && <CountryStep countries={countries} country={country} onChange={setCountryCode} />}
        {step === 1 && (
          <FieldGroup>
            {STORE_FIELDS.map((field) => (
              <TextField
                key={field.name}
                form={form}
                {...field}
                type={field.name === "store.phone" ? "tel" : "text"}
                hint={
                  field.name === "store.phone"
                    ? `Indicatif ${country.phonePrefix}, au format local ou international.`
                    : undefined
                }
              />
            ))}
          </FieldGroup>
        )}
        {step === 2 && (
          <FieldGroup>
            {MANAGER_FIELDS.map((field) => (
              <TextField
                key={field.name}
                form={form}
                {...field}
                type={field.name === "manager.phone" ? "tel" : "text"}
                hint={
                  field.name === "manager.phone"
                    ? "Si ce numéro a déjà un compte, ce compte devient gérant ; son nom n’est pas modifié."
                    : undefined
                }
              />
            ))}
          </FieldGroup>
        )}
        {step === 3 && <SettingsStep form={form} country={country} />}
        {step === 4 && <Recap form={form} country={country} onEdit={goTo} />}

        <SaveAlert message={alert} />

        <div className="flex flex-wrap justify-between gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={step === 0 || busy}
            onClick={() => goTo(step - 1)}
          >
            Précédent
          </Button>
          {step < LAST ? (
            <Button type="button" variant="action" onClick={() => void next()}>
              Suivant
            </Button>
          ) : (
            <Button type="submit" variant="action" disabled={busy}>
              {busy ? "Inscription…" : "Inscrire la quincaillerie"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function Stepper({
  step,
  reached,
  onSelect,
}: {
  step: number;
  reached: number;
  onSelect: (step: number) => void;
}) {
  return (
    <nav aria-label="Étapes de l’inscription" className="-mx-1 overflow-x-auto px-1">
      <ol className="flex min-w-max gap-2">
        {STEPS.map((item, index) => {
          const current = index === step;
          const done = index < reached && !current;
          const reachable = index <= reached;
          return (
            <li key={item.title}>
              <button
                type="button"
                disabled={!reachable}
                aria-current={current ? "step" : undefined}
                onClick={() => onSelect(index)}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-full px-3 pr-4 text-[15px] font-semibold transition-colors",
                  current ? "bg-ink text-surface" : "bg-surface text-ink",
                  reachable && !current && "hover:bg-ink/5",
                  !reachable && "cursor-not-allowed text-muted-ink",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-[13px]",
                    current ? "bg-brand text-ink" : done ? "bg-success text-surface" : "bg-canvas text-muted-ink",
                  )}
                >
                  {done ? <Check className="size-4" /> : index + 1}
                </span>
                <span>
                  <span className="sr-only">Étape {index + 1} : </span>
                  {item.title}
                  {done && <span className="sr-only"> (terminée)</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

type FormApi = ReturnType<typeof useForm<RegisterStoreFormValues>>;

/** The field's current error; subscribes this component to that field's state. */
function useFieldError(form: FormApi, name: FormPath): string | undefined {
  const formState = useFormState({ control: form.control, name });
  return form.getFieldState(name, formState).error?.message;
}

function TextField({
  form,
  name,
  label,
  hint,
  type = "text",
}: FieldSpec & { form: FormApi; hint?: string; type?: string }) {
  const id = fieldId(name);
  const message = useFieldError(form, name);
  const describedBy = [hint ? `${id}-hint` : null, message ? `${id}-error` : null].filter(Boolean).join(" ");
  return (
    <Field data-invalid={message ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type={type}
        autoComplete="off"
        aria-invalid={message ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...form.register(name)}
      />
      {hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
      <FieldError id={`${id}-error`}>{message}</FieldError>
    </Field>
  );
}

function AmountField({
  form,
  name,
  label,
  symbol,
  decimals,
}: FieldSpec & { form: FormApi; symbol: string; decimals: number }) {
  const id = fieldId(name);
  const message = useFieldError(form, name);
  return (
    <Field data-invalid={message ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          inputMode={decimals > 0 ? "decimal" : "numeric"}
          autoComplete="off"
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? `register-amount-hint ${id}-error` : "register-amount-hint"}
          {...form.register(name)}
        />
        <span aria-hidden="true" className="text-[15px] text-muted-ink">
          {symbol}
        </span>
      </div>
      <FieldError id={`${id}-error`}>{message}</FieldError>
    </Field>
  );
}

function CountryStep({
  countries,
  country,
  onChange,
}: {
  countries: Country[];
  country: Country;
  onChange: (code: string) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor="register-country">Pays</FieldLabel>
      <select
        id="register-country"
        value={country.code}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-control border border-input bg-surface px-3.5 text-[15px]"
      >
        {countries.map((item) => (
          <option key={item.code} value={item.code}>
            {item.name} ({item.code})
          </option>
        ))}
      </select>
      <FieldDescription>
        Devise : {country.currencyCode} ({country.currencySymbol}) · indicatif {country.phonePrefix}
      </FieldDescription>
    </Field>
  );
}

function SettingsStep({ form, country }: { form: FormApi; country: Country }) {
  const terms = useWatch({ control: form.control, name: "settings.terms" }) ?? "";
  const termsError = useFieldError(form, "settings.terms");
  return (
    <FieldGroup>
      <p id="register-amount-hint" className="text-[14px] text-muted-ink">
        Montants en {country.currencySymbol}, sans séparateur obligatoire.
      </p>
      {AMOUNT_FIELDS.map(({ name, label }) => (
        <AmountField key={name} form={form} name={name} label={label} symbol={country.currencySymbol} decimals={country.decimals} />
      ))}
      <TextField
        form={form}
        name="settings.deliveryDelayDays"
        label="Délai de livraison (jours, facultatif)"
        hint="1 à 365 jours. Laissé vide, la plateforme applique 30 jours."
      />
      <Field data-invalid={termsError ? true : undefined}>
        <FieldLabel htmlFor="register-settings-terms">Conditions générales (facultatif)</FieldLabel>
        <Textarea
          id="register-settings-terms"
          rows={4}
          className="text-[15px]"
          aria-invalid={termsError ? true : undefined}
          aria-describedby={
            termsError ? "register-settings-terms-count register-settings-terms-error" : "register-settings-terms-count"
          }
          {...form.register("settings.terms")}
        />
        <p id="register-settings-terms-count" className="text-right text-[13px] text-muted-ink">
          {terms.trim().length.toLocaleString("fr-FR")} / {TERMS_MAX.toLocaleString("fr-FR")}
        </p>
        <FieldError id="register-settings-terms-error">{termsError}</FieldError>
      </Field>
    </FieldGroup>
  );
}

function Recap({ form, country, onEdit }: { form: FormApi; country: Country; onEdit: (step: number) => void }) {
  const values = useWatch({ control: form.control });
  const money = { symbol: country.currencySymbol, decimals: country.decimals };
  const amount = (typed?: string) => {
    const minor = toMinorUnits(typed ?? "", country.decimals);
    return minor ? formatMoney(minor, money) : "—";
  };
  const delay = values.settings?.deliveryDelayDays?.trim();

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] text-muted-ink">
        Vérifiez les informations avant l’inscription. La quincaillerie sera créée au statut « À vérifier ».
      </p>
      <RecapSection title="Pays" onEdit={() => onEdit(0)}>
        <RecapRow label="Pays">
          {country.name} ({country.code})
        </RecapRow>
      </RecapSection>
      <RecapSection title="Quincaillerie" onEdit={() => onEdit(1)}>
        {STORE_FIELDS.map(({ name, label }) => (
          <RecapRow key={name} label={label}>
            {values.store?.[name.split(".")[1] as keyof RegisterStoreFormValues["store"]]?.trim() || "—"}
          </RecapRow>
        ))}
      </RecapSection>
      <RecapSection title="Gérant" onEdit={() => onEdit(2)}>
        {MANAGER_FIELDS.map(({ name, label }) => (
          <RecapRow key={name} label={label}>
            {values.manager?.[name.split(".")[1] as keyof RegisterStoreFormValues["manager"]]?.trim() || "—"}
          </RecapRow>
        ))}
      </RecapSection>
      <RecapSection title="Paramètres" onEdit={() => onEdit(3)}>
        <RecapRow label="Solde maximum">{amount(values.settings?.maxBalance)}</RecapRow>
        <RecapRow label="Seuil de validation">{amount(values.settings?.validationThreshold)}</RecapRow>
        <RecapRow label="Dépôt minimum">{amount(values.settings?.minDeposit)}</RecapRow>
        <RecapRow label="Délai de livraison">{delay ? `${delay} jours` : "30 jours (par défaut)"}</RecapRow>
        <RecapRow label="Conditions">
          {values.settings?.terms?.trim() ? (
            <span className="whitespace-pre-line">{values.settings.terms.trim()}</span>
          ) : (
            "Aucune"
          )}
        </RecapRow>
      </RecapSection>
    </div>
  );
}

function RecapSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-control border border-border p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[16px] font-semibold">{title}</h3>
        <Button type="button" variant="ghost" onClick={onEdit} aria-label={`Modifier : ${title}`}>
          Modifier
        </Button>
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-[15px] sm:grid-cols-[11rem_1fr]">{children}</dl>
    </section>
  );
}

function RecapRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-ink">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

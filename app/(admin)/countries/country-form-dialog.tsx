"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  COUNTRY_LANGUAGES,
  countriesQueryKey,
  createCountry,
  LANGUAGE_LABELS,
  updateCountry,
  type Country,
} from "@/lib/api/countries";
import { isApiError } from "@/lib/api/errors";
import {
  countryBody,
  countryChanges,
  countryFormSchema,
  countryFormValues,
  EMPTY_COUNTRY_FORM,
  type CountryFormInput,
  type CountryFormValues,
} from "@/lib/country-form";
import { registerRechecking, useFieldError } from "@/lib/form-fields";
import { SaveAlert, showSaveError } from "../stores/edit-support";

type FormApi = UseFormReturn<CountryFormInput, unknown, CountryFormValues>;
type FieldName = keyof CountryFormInput;

const FIELDS: FieldName[] = ["code", "name", "currencyCode", "currencySymbol", "decimals", "language"];

/** Adds a country (country null) or edits one; the code never changes. */
export function CountryFormDialog({ country, onClose }: { country: Country | null; onClose: () => void }) {
  const editing = country !== null;
  const queryClient = useQueryClient();
  // Captured once: a refetch while the dialog is open must not move the baseline.
  const [initial] = useState(() => country);
  const form: FormApi = useForm<CountryFormInput, unknown, CountryFormValues>({
    resolver: zodResolver(countryFormSchema),
    defaultValues: initial ? countryFormValues(initial) : EMPTY_COUNTRY_FORM,
  });
  const [alert, setAlert] = useState<string | null>(null);
  const [unchanged, setUnchanged] = useState(false);

  useEffect(() => {
    form.setFocus(editing ? "name" : "code");
  }, [form, editing]);

  const mutation = useMutation({
    mutationFn: (values: CountryFormValues) =>
      initial ? updateCountry(initial.code, countryChanges(initial, values)) : createCountry(countryBody(values)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: countriesQueryKey });
      toast.success(editing ? "Pays modifié." : "Pays ajouté.");
      onClose();
    },
    onError: (error) => {
      if (isApiError(error) && error.error === "COUNTRY_ALREADY_EXISTS") {
        form.setError("code", { message: error.message }, { shouldFocus: true });
        return;
      }
      // Field details on their fields; COUNTRY_IN_USE, not found, others inline.
      setAlert(showSaveError(error, form, FIELDS));
    },
  });

  const submit = form.handleSubmit((values) => {
    setAlert(null);
    setUnchanged(false);
    if (initial && Object.keys(countryChanges(initial, values)).length === 0) {
      setUnchanged(true);
      return;
    }
    mutation.mutate(values);
  });

  const pending = mutation.isPending;
  return (
    // Never closed mid-request (Escape, outside press, the close button).
    <Dialog open onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-[22px] font-bold">
            {initial ? `Modifier ${initial.name}` : "Ajouter un pays"}
          </DialogTitle>
          <DialogDescription className="text-[14px]">
            {initial
              ? "La devise ne peut plus changer une fois que le pays a des quincailleries."
              : "Le pays est créé inactif ; l’indicatif téléphonique est déduit du code."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          {initial ? (
            <p className="text-[15px]">
              <span className="text-muted-ink">Code :</span> <span className="font-semibold">{initial.code}</span>
            </p>
          ) : (
            <TextField form={form} name="code" label="Code" hint="Code ISO à 2 lettres, ex. ML" upper />
          )}
          <TextField form={form} name="name" label="Nom" />
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField form={form} name="currencyCode" label="Code devise" hint="ex. XOF" upper />
            <TextField form={form} name="currencySymbol" label="Symbole" hint="ex. F" />
            <TextField form={form} name="decimals" label="Décimales" hint="0 à 3" inputMode="numeric" />
          </div>
          <LanguageField form={form} />

          <SaveAlert message={alert} />
          {unchanged && (
            <p role="status" className="text-[15px] text-muted-ink">
              Aucune modification.
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" variant="action" disabled={pending}>
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TextField({
  form,
  name,
  label,
  hint,
  upper,
  inputMode,
}: {
  form: FormApi;
  name: FieldName;
  label: string;
  hint?: string;
  upper?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  const id = `country-${name}`;
  const message = useFieldError(form, name);
  const describedBy = [hint ? `${id}-hint` : null, message ? `${id}-error` : null].filter(Boolean).join(" ");
  return (
    <Field data-invalid={message ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        autoComplete="off"
        inputMode={inputMode}
        // Shown uppercased as typed; the schema uppercases what is sent.
        className={upper ? "uppercase" : undefined}
        aria-invalid={message ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...registerRechecking(form, name)}
      />
      {hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
      <FieldError id={`${id}-error`}>{message}</FieldError>
    </Field>
  );
}

function LanguageField({ form }: { form: FormApi }) {
  const message = useFieldError(form, "language");
  return (
    <Field data-invalid={message ? true : undefined}>
      <FieldLabel htmlFor="country-language">Langue</FieldLabel>
      <select
        id="country-language"
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? "country-language-error" : undefined}
        className="min-h-11 w-full rounded-control border border-border bg-surface px-3 text-[15px] text-ink focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        {...registerRechecking(form, "language")}
      >
        {COUNTRY_LANGUAGES.map((language) => (
          <option key={language} value={language}>
            {LANGUAGE_LABELS[language]}
          </option>
        ))}
      </select>
      <FieldError id="country-language-error">{message}</FieldError>
    </Field>
  );
}

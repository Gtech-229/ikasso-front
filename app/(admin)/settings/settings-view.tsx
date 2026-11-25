"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { Forbidden } from "@/components/forbidden";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError, isForbidden, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import {
  fetchSystemSettings,
  systemSettingsQueryKey,
  updateSystemSettings,
  type SystemSettings,
} from "@/lib/api/system-settings";
import { can } from "@/lib/auth/permissions";
import { useCurrentAdmin } from "@/lib/auth/use-current-admin";
import { registerRechecking, useFieldError } from "@/lib/form-fields";
import {
  rangeText,
  SETTING_FIELDS,
  SETTING_SECTIONS,
  settingsChanges,
  settingsFormSchema,
  settingsFormValues,
  type SettingField,
  type SettingsFormValues,
} from "@/lib/system-settings-form";
import { SaveAlert, showSaveError } from "../stores/edit-support";

type FormApi = UseFormReturn<SettingsFormValues>;

export function SettingsView() {
  const query = useQuery({
    queryKey: systemSettingsQueryKey,
    queryFn: fetchSystemSettings,
    meta: { inlineError: true },
  });
  const admin = useCurrentAdmin().data;
  const canManage = !!admin && can(admin, "settings.manage");

  if (query.isError) {
    if (isForbidden(query.error)) return <Forbidden embedded />;
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-card bg-surface p-6">
        <p className="text-[15px] text-danger">
          {isApiError(query.error) ? query.error.message : UNEXPECTED_ERROR_MESSAGE}
        </p>
        <Button variant="secondary" onClick={() => query.refetch()}>
          Réessayer
        </Button>
      </div>
    );
  }
  if (!query.data || !admin) return <SettingsSkeleton />;

  return canManage ? <SettingsForm settings={query.data} /> : <SettingsReadOnly settings={query.data} />;
}

/** Without settings.manage: the values, nothing to edit. */
function SettingsReadOnly({ settings }: { settings: SystemSettings }) {
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      {SETTING_SECTIONS.map((section) => (
        <section key={section.title} className="flex flex-col gap-3 rounded-card bg-surface p-6">
          <h2 className="font-display text-xl font-bold">{section.title}</h2>
          <dl className="flex flex-col gap-3">
            {section.fields.map((field) => (
              <div key={field.key} className="flex flex-col gap-0.5">
                <dt className="text-[15px] font-semibold">{field.label}</dt>
                <dd className="text-[15px]">
                  {field.zeroAllowed && settings[field.key] === 0
                    ? "0 (sans limite)"
                    : settings[field.key].toLocaleString("fr-FR")}
                </dd>
                <dd className="text-[13px] text-muted-ink">{field.hint}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

function SettingsForm({ settings }: { settings: SystemSettings }) {
  const queryClient = useQueryClient();
  // The values the form compares against: the last saved ones.
  const [baseline, setBaseline] = useState(settings);
  const form: FormApi = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: settingsFormValues(baseline),
  });
  const [alert, setAlert] = useState<string | null>(null);
  const [unchanged, setUnchanged] = useState(false);

  const mutation = useMutation({
    mutationFn: (changes: Partial<SystemSettings>) => updateSystemSettings(changes),
    onSuccess: (saved) => {
      queryClient.setQueryData(systemSettingsQueryKey, saved);
      setBaseline(saved);
      form.reset(settingsFormValues(saved));
      toast.success("Paramètres enregistrés.");
    },
    // Field details on their fields (first one focused); 403, network and others inline.
    onError: (error) => setAlert(showSaveError(error, form, SETTING_FIELDS.map((field) => field.key))),
  });

  const submit = form.handleSubmit((values) => {
    setAlert(null);
    setUnchanged(false);
    const changes = settingsChanges(baseline, values);
    if (Object.keys(changes).length === 0) {
      setUnchanged(true);
      return;
    }
    mutation.mutate(changes);
  });

  const pending = mutation.isPending;
  return (
    <form onSubmit={submit} noValidate className="flex max-w-3xl flex-col gap-5">
      {SETTING_SECTIONS.map((section) => (
        <fieldset key={section.title} disabled={pending} className="flex flex-col gap-4 rounded-card bg-surface p-6">
          <legend className="sr-only">{section.title}</legend>
          <h2 aria-hidden="true" className="font-display text-xl font-bold">
            {section.title}
          </h2>
          {section.fields.map((field) => (
            <SettingInput key={field.key} form={form} field={field} />
          ))}
        </fieldset>
      ))}

      <p className="text-[14px] text-muted-ink">Les nouvelles valeurs s’appliquent dès la prochaine connexion.</p>
      <SaveAlert message={alert} />
      {unchanged && (
        <p role="status" className="text-[15px] text-muted-ink">
          Aucune modification.
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => {
            form.reset(settingsFormValues(baseline));
            setAlert(null);
            setUnchanged(false);
          }}
        >
          Annuler
        </Button>
        <Button type="submit" variant="action" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

function SettingInput({ form, field }: { form: FormApi; field: SettingField }) {
  const id = `setting-${field.key}`;
  const message = useFieldError(form, field.key);
  return (
    <Field data-invalid={message ? true : undefined}>
      <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        className="max-w-40"
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? `${id}-hint ${id}-error` : `${id}-hint`}
        {...registerRechecking(form, field.key)}
      />
      <FieldDescription id={`${id}-hint`}>
        {field.hint} Valeurs : {rangeText(field)}.
      </FieldDescription>
      <FieldError id={`${id}-error`}>{message}</FieldError>
    </Field>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-56 rounded-card" />
      ))}
    </div>
  );
}

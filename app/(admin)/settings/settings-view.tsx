"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { Forbidden } from "@/components/forbidden";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isApiError, isForbidden, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import {
  fetchSystemSettings,
  systemSettingsQueryKey,
  updateSystemSettings,
  type SystemSettingKey,
  type SystemSettings,
} from "@/lib/api/system-settings";
import { can } from "@/lib/auth/permissions";
import { useCurrentAdmin } from "@/lib/auth/use-current-admin";
import { registerRechecking, useFieldError } from "@/lib/form-fields";
import {
  rangeText,
  SETTING_SECTIONS,
  sectionChanges,
  sectionFormSchema,
  sectionFormValues,
  type SectionFormValues,
  type SettingField,
  type SettingSection,
} from "@/lib/system-settings-form";
import { SaveAlert } from "../stores/edit-support";

type FormApi = UseFormReturn<SectionFormValues>;

// Same pill tabs as the store file (stores/[id]/store-view.tsx).
const TAB_TRIGGER =
  "min-h-11 flex-none rounded-full bg-surface px-4 text-[15px] font-semibold text-ink hover:bg-ink/5 data-active:bg-ink data-active:text-surface data-active:shadow-none";

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
  const settings = query.data;

  // The three sections as tabs (user revision, 2026-11-25). Panels stay
  // mounted when hidden, so a tab's typed values survive looking at another.
  return (
    <Tabs defaultValue={SETTING_SECTIONS[0].title} className="max-w-3xl gap-4">
      <div className="-mx-1 overflow-x-auto px-1">
        <TabsList aria-label="Groupes de paramètres" className="h-auto gap-2 bg-transparent p-0">
          {SETTING_SECTIONS.map((section) => (
            <TabsTrigger key={section.title} value={section.title} className={TAB_TRIGGER}>
              {section.title}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {SETTING_SECTIONS.map((section) => (
        <TabsContent key={section.title} value={section.title} keepMounted>
          {canManage ? (
            <SectionForm section={section} settings={settings} />
          ) : (
            <SectionReadOnly section={section} settings={settings} />
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

/** Without settings.manage: the values, nothing to edit. */
function SectionReadOnly({ section, settings }: { section: SettingSection; settings: SystemSettings }) {
  return (
    <section className="flex flex-col gap-3 rounded-card bg-surface p-6">
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
  );
}

/**
 * One tab's own form: it saves only its fields. The saved values come from the
 * settings query, so a save in another tab never moves this tab's edits.
 */
function SectionForm({ section, settings }: { section: SettingSection; settings: SystemSettings }) {
  const queryClient = useQueryClient();
  // F-11: the untouched fields follow the latest saved values (another tab's
  // save brings every value the API returned), while typed edits are kept, so
  // an untouched field never looks changed and is never resent stale. reset()
  // merges these options into every call: the explicit resets below override.
  const form: FormApi = useForm<SectionFormValues>({
    resolver: zodResolver(sectionFormSchema(section)),
    values: sectionFormValues(section, settings),
    resetOptions: { keepDirtyValues: true },
  });
  const [alert, setAlert] = useState<string | null>(null);
  const [unchanged, setUnchanged] = useState(false);
  // F-09: the first field the API refused, focused once the form is enabled again.
  const refused = useRef<SystemSettingKey | null>(null);
  const keys = section.fields.map((field) => field.key);

  const mutation = useMutation({
    mutationFn: (changes: Partial<SystemSettings>) => updateSystemSettings(changes),
    onSuccess: (saved) => {
      queryClient.setQueryData(systemSettingsQueryKey, saved);
      // Explicit reset: the saved values replace the typed ones and nothing
      // stays dirty (the form-wide keepDirtyValues is only for the sync below).
      form.reset(sectionFormValues(section, saved), { keepDirtyValues: false });
      toast.success("Paramètres enregistrés.");
    },
    onError: (error) => {
      if (!isApiError(error)) {
        setAlert(UNEXPECTED_ERROR_MESSAGE);
        return;
      }
      // Each API detail on its field, without focus: the fields are still
      // disabled here (the mutation is pending until onError returns).
      let first: SystemSettingKey | null = null;
      for (const detail of error.details) {
        const key = keys.find((name) => name === detail.field);
        if (key && detail.errors[0]) {
          form.setError(key, { message: detail.errors[0] });
          first ??= key;
        }
      }
      if (first) refused.current = first;
      else setAlert(error.message);
    },
  });

  const pending = mutation.isPending;
  useEffect(() => {
    if (pending || !refused.current) return;
    form.setFocus(refused.current);
    refused.current = null;
  }, [pending, form]);

  const submit = form.handleSubmit((values) => {
    setAlert(null);
    setUnchanged(false);
    const changes = sectionChanges(section, settings, values);
    if (Object.keys(changes).length === 0) {
      setUnchanged(true);
      return;
    }
    mutation.mutate(changes);
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <fieldset disabled={pending} className="flex flex-col gap-4 rounded-card bg-surface p-6">
        <legend className="sr-only">{section.title}</legend>
        <h2 aria-hidden="true" className="font-display text-xl font-bold">
          {section.title}
        </h2>
        {section.fields.map((field) => (
          <SettingInput key={field.key} form={form} field={field} />
        ))}
      </fieldset>

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
            // Back to the saved values, typed ones included (F-13).
            form.reset(sectionFormValues(section, settings), { keepDirtyValues: false });
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
    <div className="flex max-w-3xl flex-col gap-4">
      <Skeleton className="h-11 w-96 max-w-full rounded-full" />
      <Skeleton className="h-72 rounded-card" />
    </div>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { storeDetailQueryKey, updateStoreSettings, type StoreDetail } from "@/lib/api/stores";
import { invalidateStoreLists } from "@/lib/api/stores-queries";
import { can } from "@/lib/auth/permissions";
import { useCurrentAdmin } from "@/lib/auth/use-current-admin";
import { formatMoney } from "@/lib/format";
import { fromMinorUnits } from "@/lib/money-input";
import {
  settingsChanges,
  settingsFormValues,
  storeSettingsFormSchema,
  TERMS_MAX,
  type StoreSettingsFormValues,
} from "@/lib/store-forms";
import { handleStoreClosed, SaveAlert, showSaveError } from "../edit-support";
import { Row, Rows } from "./rows";

const AMOUNTS = [
  { name: "maxBalance", label: "Solde maximum" },
  { name: "validationThreshold", label: "Seuil de validation" },
  { name: "minDeposit", label: "Dépôt minimum" },
] as const;
const FIELDS = ["maxBalance", "validationThreshold", "minDeposit", "deliveryDelayDays", "terms"] as const;

export function SettingsPanel({ store }: { store: StoreDetail }) {
  const admin = useCurrentAdmin().data;
  const canEdit = !!admin && can(admin, "store-settings.manage") && store.status !== "CLOSED";
  const [editing, setEditing] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const money = { symbol: store.country.currencySymbol, decimals: store.country.decimals };
  const { settings } = store;

  function leave() {
    setEditing(false);
    requestAnimationFrame(() => editButton.current?.focus());
  }

  return (
    <div
      ref={panel}
      // Focus target when "Modifier" disappears (store closed meanwhile).
      tabIndex={-1}
      className="flex flex-col gap-5 rounded-control outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {editing && canEdit ? (
        <SettingsForm store={store} onLeave={leave} onClosed={() => panel.current?.focus()} />
      ) : (
        <>
          <Rows>
            <Row label="Solde maximum">{formatMoney(settings.maxBalance, money)}</Row>
            <Row label="Seuil de validation">{formatMoney(settings.validationThreshold, money)}</Row>
            <Row label="Dépôt minimum">{formatMoney(settings.minDeposit, money)}</Row>
            <Row label="Délai de livraison">
              {settings.deliveryDelayDays} jour{settings.deliveryDelayDays > 1 ? "s" : ""}
            </Row>
            <Row label="Conditions">
              {settings.terms ? <span className="whitespace-pre-line">{settings.terms}</span> : "Aucune"}
            </Row>
          </Rows>
          {canEdit && (
            <div>
              <Button ref={editButton} variant="secondary" onClick={() => setEditing(true)}>
                Modifier
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SettingsForm({
  store,
  onLeave,
  onClosed,
}: {
  store: StoreDetail;
  onLeave: () => void;
  onClosed: () => void;
}) {
  const queryClient = useQueryClient();
  const { decimals, currencySymbol } = store.country;
  // Starting values kept for the whole edit session (see the information form).
  const [initial] = useState(() => settingsFormValues(store.settings, decimals, fromMinorUnits));
  const form = useForm<StoreSettingsFormValues>({
    resolver: zodResolver(storeSettingsFormSchema(decimals)),
    defaultValues: initial,
  });
  const terms = useWatch({ control: form.control, name: "terms" }) ?? "";
  const [alert, setAlert] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (values: StoreSettingsFormValues) =>
      updateStoreSettings(store.id, settingsChanges(initial, values, decimals)),
    onSuccess: (updated) => {
      queryClient.setQueryData(storeDetailQueryKey(store.id), updated);
      invalidateStoreLists(queryClient);
      toast.success("Paramètres enregistrés.");
      onLeave();
    },
    onError: (error) => {
      if (handleStoreClosed(error, queryClient, store.id, onLeave, onClosed)) return;
      setAlert(showSaveError(error, form, FIELDS));
    },
  });

  useEffect(() => form.setFocus("maxBalance"), [form]);

  const { errors, isDirty } = form.formState;
  const describe = (name: string, extra?: string) =>
    [extra, errors[name as keyof StoreSettingsFormValues] ? `settings-${name}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <form
      noValidate
      aria-label="Modifier les paramètres"
      onSubmit={form.handleSubmit((values) => {
        setAlert(null);
        if (Object.keys(settingsChanges(initial, values, decimals)).length === 0) return onLeave();
        mutation.mutate(values);
      })}
    >
      <FieldGroup>
        <p id="settings-amount-hint" className="text-[14px] text-muted-ink">
          Montants en {currencySymbol}, sans séparateur obligatoire.
        </p>
        {AMOUNTS.map(({ name, label }) => {
          const message = errors[name]?.message;
          return (
            <Field key={name} data-invalid={message ? true : undefined}>
              <FieldLabel htmlFor={`settings-${name}`}>{label}</FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  id={`settings-${name}`}
                  inputMode={decimals > 0 ? "decimal" : "numeric"}
                  autoComplete="off"
                  aria-invalid={message ? true : undefined}
                  aria-describedby={describe(name, "settings-amount-hint")}
                  {...form.register(name)}
                />
                <span aria-hidden="true" className="text-[15px] text-muted-ink">
                  {currencySymbol}
                </span>
              </div>
              <FieldError id={`settings-${name}-error`}>{message}</FieldError>
            </Field>
          );
        })}

        <Field data-invalid={errors.deliveryDelayDays ? true : undefined}>
          <FieldLabel htmlFor="settings-deliveryDelayDays">Délai de livraison (jours)</FieldLabel>
          <Input
            id="settings-deliveryDelayDays"
            inputMode="numeric"
            className="max-w-32"
            aria-invalid={errors.deliveryDelayDays ? true : undefined}
            aria-describedby={describe("deliveryDelayDays", "settings-delay-hint")}
            {...form.register("deliveryDelayDays")}
          />
          <FieldDescription id="settings-delay-hint">
            Jours après la confirmation du client au-delà desquels il peut demander l’annulation d’un bon
            non livré (1 à 365).
          </FieldDescription>
          <FieldError id="settings-deliveryDelayDays-error">{errors.deliveryDelayDays?.message}</FieldError>
        </Field>

        <Field data-invalid={errors.terms ? true : undefined}>
          <FieldLabel htmlFor="settings-terms">Conditions générales</FieldLabel>
          <Textarea
            id="settings-terms"
            rows={5}
            className="text-[15px]"
            aria-invalid={errors.terms ? true : undefined}
            aria-describedby={describe("terms", "settings-terms-count")}
            {...form.register("terms")}
          />
          <p id="settings-terms-count" className="text-right text-[13px] text-muted-ink">
            {terms.trim().length.toLocaleString("fr-FR")} / {TERMS_MAX.toLocaleString("fr-FR")}
          </p>
          <FieldError id="settings-terms-error">{errors.terms?.message}</FieldError>
        </Field>

        <SaveAlert message={alert} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="action" disabled={!isDirty || mutation.isPending}>
            {mutation.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
          <Button type="button" variant="secondary" disabled={mutation.isPending} onClick={onLeave}>
            Annuler
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

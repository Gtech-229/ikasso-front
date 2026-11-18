"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { storeDetailQueryKey, updateStore, type StoreDetail } from "@/lib/api/stores";
import { invalidateStoreLists } from "@/lib/api/stores-queries";
import { can } from "@/lib/auth/permissions";
import { useCurrentAdmin } from "@/lib/auth/use-current-admin";
import { formatDate } from "@/lib/format";
import { changedFields, storeInfoSchema, type StoreInfoValues } from "@/lib/store-forms";
import { handleStoreClosed, SaveAlert, showSaveError } from "./edit-support";
import { Row, Rows } from "./rows";

const FIELDS = ["name", "address", "city", "phone", "tradeRegister"] as const;
const LABELS: Record<(typeof FIELDS)[number], string> = {
  name: "Nom",
  address: "Adresse",
  city: "Ville",
  phone: "Téléphone",
  tradeRegister: "Registre du commerce",
};

export function InformationPanel({ store }: { store: StoreDetail }) {
  const admin = useCurrentAdmin().data;
  const canEdit = !!admin && can(admin, "stores.manage") && store.status !== "CLOSED";
  const [editing, setEditing] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

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
        <InformationForm store={store} onLeave={leave} onClosed={() => panel.current?.focus()} />
      ) : (
        <>
          <Rows>
            <Row label="Adresse">{store.address}</Row>
            <Row label="Ville">
              {store.city}, {store.country.name}
            </Row>
            <Row label="Téléphone">{store.phone}</Row>
            <Row label="Registre du commerce">{store.tradeRegister}</Row>
            <Row label="Inscription">
              {store.selfRegistered ? "Depuis l’application" : "Par un administrateur"}, le{" "}
              {formatDate(store.createdAt)}
            </Row>
            <Row label="Vérification">{store.verifiedAt ? `Le ${formatDate(store.verifiedAt)}` : "—"}</Row>
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

function InformationForm({
  store,
  onLeave,
  onClosed,
}: {
  store: StoreDetail;
  onLeave: () => void;
  onClosed: () => void;
}) {
  const queryClient = useQueryClient();
  // The values the edit started from, kept for the whole session: a refetch
  // mid-edit must not turn another admin's change into an edit of ours.
  const [initial] = useState<StoreInfoValues>(() => ({
    name: store.name,
    address: store.address,
    city: store.city,
    phone: store.phone,
    tradeRegister: store.tradeRegister,
  }));
  const form = useForm<StoreInfoValues>({ resolver: zodResolver(storeInfoSchema), defaultValues: initial });
  const [alert, setAlert] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (values: StoreInfoValues) => updateStore(store.id, changedFields(initial, values)),
    onSuccess: (updated) => {
      queryClient.setQueryData(storeDetailQueryKey(store.id), updated);
      invalidateStoreLists(queryClient); // name, city and phone are listed
      toast.success("Informations enregistrées.");
      onLeave();
    },
    onError: (error) => {
      if (handleStoreClosed(error, queryClient, store.id, onLeave, onClosed)) return;
      setAlert(showSaveError(error, form, FIELDS));
    },
  });

  // Opening the form removes the focused "Modifier": start in the first field.
  useEffect(() => form.setFocus("name"), [form]);

  const { errors, isDirty } = form.formState;

  return (
    <form
      noValidate
      aria-label="Modifier les informations"
      onSubmit={form.handleSubmit((values) => {
        setAlert(null);
        // Only spaces changed: nothing to send.
        if (Object.keys(changedFields(initial, values)).length === 0) return onLeave();
        mutation.mutate(values);
      })}
    >
      <FieldGroup>
        {FIELDS.map((name) => {
          const message = errors[name]?.message;
          return (
            <Field key={name} data-invalid={message ? true : undefined}>
              <FieldLabel htmlFor={`info-${name}`}>{LABELS[name]}</FieldLabel>
              <Input
                id={`info-${name}`}
                type={name === "phone" ? "tel" : "text"}
                autoComplete="off"
                aria-invalid={message ? true : undefined}
                aria-describedby={
                  [name === "phone" ? "info-phone-hint" : null, message ? `info-${name}-error` : null]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
                {...form.register(name)}
              />
              {name === "phone" && (
                <FieldDescription id="info-phone-hint">
                  Numéro du pays de la quincaillerie, au format local ou international.
                </FieldDescription>
              )}
              <FieldError id={`info-${name}-error`}>{message}</FieldError>
            </Field>
          );
        })}
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

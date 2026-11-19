"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useIsMutating, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { StatusPill, SUBSCRIPTION_STATE_TONES } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import { PLAN_LABELS, storeDetailQueryKey, type StoreSummary } from "@/lib/api/stores";
import { invalidateStoreLists } from "@/lib/api/stores-queries";
import {
  createSubscription,
  fetchStoreSubscriptions,
  PLANS,
  storeSubscriptionsQueryKey,
  SUBSCRIPTION_STATUS_LABELS,
  updateSubscription,
  type SubscriptionView,
} from "@/lib/api/subscriptions";
import { can } from "@/lib/auth/permissions";
import { useCurrentAdmin } from "@/lib/auth/use-current-admin";
import { formatDate } from "@/lib/format";
import { registerRechecking, useFieldError } from "@/lib/form-fields";
import {
  EMPTY_SUBSCRIPTION_FORM,
  subscriptionBody,
  subscriptionChanges,
  subscriptionFormSchema,
  subscriptionFormValues,
  type SubscriptionFormValues,
} from "@/lib/subscription-form";
import { SaveAlert, showSaveError } from "../stores/edit-support";

const FORM_FIELDS = ["plan", "startsOn", "endsOn"] as const;
const HISTORY_HEADING_ID = "subscriptions-history-title";

const saveMutationKey = (storeId: string) => ["subscription-save", storeId] as const;

type Mode =
  | { kind: "list"; focusHeading: boolean }
  | { kind: "create" }
  | { kind: "edit"; subscription: SubscriptionView };

/** What a saved or refused subscription changes on screen. */
function refreshStoreSubscriptions(queryClient: QueryClient, storeId: string) {
  void queryClient.invalidateQueries({ queryKey: storeSubscriptionsQueryKey(storeId) });
  // The table, the KPI and tab counts (["stores","list"], ["stores","count"]).
  invalidateStoreLists(queryClient);
  void queryClient.invalidateQueries({ queryKey: storeDetailQueryKey(storeId) });
}

export function SubscriptionsDialog({ store, onClose }: { store: StoreSummary; onClose: () => void }) {
  const admin = useCurrentAdmin().data;
  const canManage = !!admin && can(admin, "subscriptions.manage");
  const [mode, setMode] = useState<Mode>({ kind: "list", focusHeading: false });
  // Closed when opened, or found closed by a refused save (STORE_CLOSED).
  const [closedNotice, setClosedNotice] = useState<string | null>(null);
  const closed = store.status === "CLOSED" || closedNotice !== null;
  const saving = useIsMutating({ mutationKey: saveMutationKey(store.id) }) > 0;

  const backToList = () => setMode({ kind: "list", focusHeading: true });

  return (
    // Never closed mid-request (Escape, outside press, the close button).
    <Dialog open onOpenChange={(next) => !next && !saving && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-[22px] font-bold">Abonnements · {store.name}</DialogTitle>
          <DialogDescription className="text-[14px]">
            Le premier et le dernier jour de chaque abonnement sont inclus (dates UTC).
          </DialogDescription>
        </DialogHeader>

        {mode.kind === "list" ? (
          <History
            storeId={store.id}
            canManage={canManage}
            closed={closed}
            notice={closedNotice}
            focusHeading={mode.focusHeading}
            onCreate={() => setMode({ kind: "create" })}
            onEdit={(subscription) => setMode({ kind: "edit", subscription })}
          />
        ) : (
          <SubscriptionForm
            storeId={store.id}
            subscription={mode.kind === "edit" ? mode.subscription : undefined}
            onDone={backToList}
            onStoreClosed={(message) => {
              setClosedNotice(message);
              backToList();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function History({
  storeId,
  canManage,
  closed,
  notice,
  focusHeading,
  onCreate,
  onEdit,
}: {
  storeId: string;
  canManage: boolean;
  closed: boolean;
  notice: string | null;
  focusHeading: boolean;
  onCreate: () => void;
  onEdit: (subscription: SubscriptionView) => void;
}) {
  const query = useQuery({
    queryKey: storeSubscriptionsQueryKey(storeId),
    queryFn: () => fetchStoreSubscriptions(storeId),
    meta: { inlineError: true },
  });
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Back from the form (saved, cancelled or refused): the form is gone, keep focus here.
  useEffect(() => {
    if (focusHeading) headingRef.current?.focus();
  }, [focusHeading]);

  return (
    <section aria-labelledby={HISTORY_HEADING_ID} className="flex flex-col gap-4">
      <h3
        id={HISTORY_HEADING_ID}
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-[18px] font-bold outline-none"
      >
        Historique
      </h3>

      {notice && <SaveAlert message={notice} />}

      {query.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-[15px] text-danger">
            {isApiError(query.error) ? query.error.message : UNEXPECTED_ERROR_MESSAGE}
          </p>
          <Button variant="secondary" onClick={() => query.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : !query.data ? (
        <div role="status" aria-label="Chargement des abonnements" className="flex flex-col gap-2">
          <Skeleton className="h-16 rounded-control" />
          <Skeleton className="h-16 rounded-control" />
        </div>
      ) : query.data.length === 0 ? (
        <p className="text-[15px] text-muted-ink">Aucun abonnement enregistré.</p>
      ) : (
        <ul className="flex flex-col gap-2" aria-busy={query.isFetching || undefined}>
          {query.data.map((subscription) => (
            <li
              key={subscription.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-canvas px-4 py-3"
            >
              <div className="flex flex-col gap-1">
                <p className="flex items-center gap-2 text-[15px] font-semibold">
                  {PLAN_LABELS[subscription.plan]}
                  {/* A subscription's status is one of the store states: same pill colours. */}
                  <StatusPill tone={SUBSCRIPTION_STATE_TONES[subscription.status]}>
                    {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
                  </StatusPill>
                </p>
                <p className="text-[14px] text-muted-ink">
                  du {formatDate(subscription.startsOn)} au {formatDate(subscription.endsOn)}
                </p>
              </div>
              {canManage && (
                <Button
                  variant="secondary"
                  onClick={() => onEdit(subscription)}
                  aria-label={`Modifier l’abonnement ${PLAN_LABELS[subscription.plan]} du ${formatDate(subscription.startsOn)} au ${formatDate(subscription.endsOn)}`}
                >
                  Modifier
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage &&
        (closed ? (
          <p className="text-[14px] text-muted-ink">Quincaillerie fermée : elle ne reçoit plus d’abonnement.</p>
        ) : (
          <Button variant="action" className="self-start" onClick={onCreate}>
            Enregistrer un abonnement
          </Button>
        ))}
    </section>
  );
}

type FormApi = ReturnType<typeof useForm<SubscriptionFormValues>>;

function SubscriptionForm({
  storeId,
  subscription,
  onDone,
  onStoreClosed,
}: {
  storeId: string;
  /** Absent when recording a new one. */
  subscription?: SubscriptionView;
  onDone: () => void;
  onStoreClosed: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  // Captured once: a refetch while the form is open must not move the baseline.
  const [initial] = useState(() =>
    subscription ? subscriptionFormValues(subscription) : EMPTY_SUBSCRIPTION_FORM,
  );
  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: initial,
  });
  const [alert, setAlert] = useState<string | null>(null);
  const [unchanged, setUnchanged] = useState(false);
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);

  // Opening the form removed the clicked button: start on the plan.
  useEffect(() => {
    const radios = fieldsetRef.current;
    (radios?.querySelector<HTMLInputElement>("input:checked") ?? radios?.querySelector("input"))?.focus();
  }, []);

  const mutation = useMutation({
    mutationKey: saveMutationKey(storeId),
    mutationFn: (values: SubscriptionFormValues) =>
      subscription
        ? updateSubscription(subscription.id, subscriptionChanges(initial, values))
        : createSubscription(storeId, subscriptionBody(values)),
    onSuccess: () => {
      refreshStoreSubscriptions(queryClient, storeId);
      toast.success(subscription ? "Abonnement modifié." : "Abonnement enregistré.");
      onDone();
    },
    onError: (error) => {
      if (isApiError(error) && error.error === "STORE_CLOSED") {
        refreshStoreSubscriptions(queryClient, storeId);
        onStoreClosed(error.message);
        return;
      }
      if (isApiError(error) && error.error === "INVALID_SUBSCRIPTION_PERIOD") {
        form.setError("endsOn", { message: error.message }, { shouldFocus: true });
        return;
      }
      // Field details on their fields; anything else (overlap, not found) inline.
      setAlert(showSaveError(error, form, [...FORM_FIELDS]));
    },
  });

  const submit = form.handleSubmit((values) => {
    setAlert(null);
    setUnchanged(false);
    if (subscription && Object.keys(subscriptionChanges(initial, values)).length === 0) {
      setUnchanged(true);
      return;
    }
    mutation.mutate(values);
  });

  const pending = mutation.isPending;
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <h3 className="font-display text-[18px] font-bold">
        {subscription ? "Modifier l’abonnement" : "Enregistrer un abonnement"}
      </h3>

      <PlanField form={form} fieldsetRef={fieldsetRef} />

      <div className="grid gap-4 sm:grid-cols-2">
        <DayField form={form} name="startsOn" label="Premier jour" alsoRecheck="endsOn" />
        <DayField form={form} name="endsOn" label="Dernier jour" />
      </div>

      <SaveAlert message={alert} />
      {unchanged && (
        <p role="status" className="text-[15px] text-muted-ink">
          Aucune modification.
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" disabled={pending} onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit" variant="action" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

function PlanField({
  form,
  fieldsetRef,
}: {
  form: FormApi;
  fieldsetRef: React.RefObject<HTMLFieldSetElement | null>;
}) {
  const message = useFieldError(form, "plan");
  return (
    <FieldSet
      ref={fieldsetRef}
      data-invalid={message ? true : undefined}
      aria-describedby={message ? "subscription-plan-error" : undefined}
      className="gap-2"
    >
      <FieldLegend className="text-[15px] font-semibold">Formule</FieldLegend>
      <div className="flex flex-wrap gap-2">
        {PLANS.map((plan) => (
          <label
            key={plan}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-border bg-surface px-4 text-[15px] font-semibold has-checked:border-ink has-checked:bg-brand-soft has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
          >
            <input
              type="radio"
              value={plan}
              // Radios take no aria-invalid: the fieldset carries the error.
              className="size-4 accent-ink"
              {...registerRechecking(form, "plan")}
            />
            {PLAN_LABELS[plan]}
          </label>
        ))}
      </div>
      <FieldError id="subscription-plan-error">{message}</FieldError>
    </FieldSet>
  );
}

function DayField({
  form,
  name,
  label,
  alsoRecheck,
}: {
  form: FormApi;
  name: "startsOn" | "endsOn";
  label: string;
  alsoRecheck?: "endsOn";
}) {
  const id = `subscription-${name}`;
  const message = useFieldError(form, name);
  return (
    <Field data-invalid={message ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="date"
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? `${id}-hint ${id}-error` : `${id}-hint`}
        {...registerRechecking(form, name, alsoRecheck)}
      />
      <FieldDescription id={`${id}-hint`}>Inclus.</FieldDescription>
      <FieldError id={`${id}-error`}>{message}</FieldError>
    </Field>
  );
}

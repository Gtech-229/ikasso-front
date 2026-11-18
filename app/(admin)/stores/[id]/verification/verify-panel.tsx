"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { isApiError, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import { invalidateStoreLists } from "@/lib/api/stores-queries";
import {
  STORE_STATUS_LABELS,
  storeDetailQueryKey,
  verifyStore,
  type StoreDetail,
} from "@/lib/api/stores";
import { can } from "@/lib/auth/permissions";
import { useCurrentAdmin } from "@/lib/auth/use-current-admin";

// UI only (not stored): the API does not record the checklist.
const CHECKS = [
  "Le nom et l’adresse correspondent au registre du commerce",
  "Le numéro du registre du commerce est lisible et identique",
  "La pièce d’identité du gérant est lisible et en cours de validité",
  "Le nom du gérant correspond à la pièce d’identité",
] as const;

export function VerifyPanel({ store }: { store: StoreDetail }) {
  const admin = useCurrentAdmin().data;
  const canManage = admin ? can(admin, "stores.manage") : false;

  let body: React.ReactNode;
  if (store.status !== "PENDING") {
    body = (
      <p className="text-[15px] text-muted-ink">
        Ce dossier n’est plus à vérifier ({STORE_STATUS_LABELS[store.status]}).
      </p>
    );
  } else if (!canManage) {
    body = (
      <p className="text-[15px] text-muted-ink">
        Seul un administrateur autorisé à gérer les quincailleries peut valider ce dossier.
      </p>
    );
  } else {
    // Remount on store change so ticks never carry over to another file.
    body = <Checklist key={store.id} store={store} />;
  }

  return (
    <aside aria-labelledby="verify-title" className="flex h-fit flex-col gap-4 rounded-card bg-surface p-6">
      <h2 id="verify-title" tabIndex={-1} className="font-display text-[22px] font-bold outline-none">
        Vérifications
      </h2>
      {body}
    </aside>
  );
}

function Checklist({ store }: { store: StoreDetail }) {
  const [checked, setChecked] = useState<boolean[]>(() => CHECKS.map(() => false));
  const [confirming, setConfirming] = useState(false);
  const allChecked = checked.every(Boolean);

  return (
    <>
      <fieldset className="flex flex-col gap-1">
        <legend className="sr-only">Vérifications</legend>
        {CHECKS.map((text, index) => (
          <label key={text} className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-[15px]">
            <Checkbox
              className="mt-0.5 size-5"
              checked={checked[index]}
              onCheckedChange={(value) =>
                setChecked((current) => current.map((item, i) => (i === index ? value === true : item)))
              }
            />
            <span>{text}</span>
          </label>
        ))}
      </fieldset>
      <Button
        variant="action"
        disabled={!allChecked}
        aria-describedby={allChecked ? undefined : "verify-hint"}
        onClick={() => setConfirming(true)}
      >
        Valider le dossier
      </Button>
      {!allChecked && (
        <p id="verify-hint" className="text-[13px] text-muted-ink">
          Cochez les quatre vérifications pour valider.
        </p>
      )}
      <ConfirmVerify store={store} open={confirming} onOpenChange={setConfirming} />
    </>
  );
}

function ConfirmVerify({
  store,
  open,
  onOpenChange,
}: {
  store: StoreDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => verifyStore(store.id),
    onSuccess: (updated) => {
      queryClient.setQueryData(storeDetailQueryKey(store.id), updated);
      invalidateStoreLists(queryClient);
      toast.success("Quincaillerie vérifiée.");
      onOpenChange(false);
    },
  });

  // Someone else already changed the status: keep the dialog and its message
  // until the admin closes it, then load the current state.
  const statusChanged = isApiError(mutation.error) && mutation.error.error === "INVALID_STATUS_TRANSITION";

  // The one way to close (Annuler, Escape, outside press): never mid-request,
  // and the next opening starts without the previous error.
  function close() {
    if (mutation.isPending) return;
    const reload = statusChanged;
    mutation.reset();
    onOpenChange(false);
    if (reload) {
      void queryClient
        .invalidateQueries({ queryKey: storeDetailQueryKey(store.id) })
        // The trigger button is gone with the checklist: give focus a home.
        .then(() => document.getElementById("verify-title")?.focus());
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (next) onOpenChange(true);
        else close();
      }}
    >
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Valider le dossier de {store.name} ?</AlertDialogTitle>
          <AlertDialogDescription>La quincaillerie passera au statut Vérifiée.</AlertDialogDescription>
        </AlertDialogHeader>
        {mutation.isError && (
          <p role="alert" className="rounded-control bg-danger/10 px-4 py-3 text-[15px] text-danger">
            {isApiError(mutation.error) ? mutation.error.message : UNEXPECTED_ERROR_MESSAGE}
          </p>
        )}
        <AlertDialogFooter>
          <Button variant="secondary" disabled={mutation.isPending} onClick={close}>
            {statusChanged ? "Fermer" : "Annuler"}
          </Button>
          <Button
            variant="action"
            // Retrying cannot succeed once the status changed elsewhere.
            disabled={mutation.isPending || statusChanged}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Validation…" : "Valider"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

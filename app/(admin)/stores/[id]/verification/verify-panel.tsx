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
import {
  pendingStoresCountQueryKey,
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
      <h2 id="verify-title" className="font-display text-[22px] font-bold">
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
      // The list, its counts and the sidebar badge; not the photos on screen.
      void queryClient.invalidateQueries({ queryKey: ["stores", "list"] });
      void queryClient.invalidateQueries({ queryKey: ["stores", "count"] });
      void queryClient.invalidateQueries({ queryKey: pendingStoresCountQueryKey });
      toast.success("Quincaillerie vérifiée.");
      onOpenChange(false);
    },
    onError: (error) => {
      // Someone else already changed the status: show the current state.
      if (isApiError(error) && error.error === "INVALID_STATUS_TRANSITION") {
        void queryClient.invalidateQueries({ queryKey: storeDetailQueryKey(store.id) });
      }
    },
  });

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (mutation.isPending) return; // never close mid-request
        if (!next) mutation.reset();
        onOpenChange(next);
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
          <Button variant="secondary" disabled={mutation.isPending} onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="action" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Validation…" : "Valider"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

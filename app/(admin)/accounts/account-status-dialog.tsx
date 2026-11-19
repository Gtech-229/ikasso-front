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
import { Textarea } from "@/components/ui/textarea";
import { reactivateAccount, suspendAccount, type Account } from "@/lib/api/accounts";
import { isApiError, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import { apiFieldMessage } from "@/lib/api/field-errors";
import { REASON_MAX, reasonSchema } from "@/lib/store-lifecycle";
import { ACCOUNTS_HEADING_ID } from "./accounts-table";

const REASON_ID = "account-reason";

function focusList() {
  document.getElementById(ACCOUNTS_HEADING_ID)?.focus();
}

/** Suspend (with a reason) an active account, or reactivate a suspended one. */
export function AccountStatusDialog({ account, onClose }: { account: Account; onClose: () => void }) {
  const suspending = account.status === "ACTIVE";
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["accounts"] });
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string>();

  const mutation = useMutation({
    mutationFn: () => (suspending ? suspendAccount(account.id, reason.trim()) : reactivateAccount(account.id)),
    onSuccess: () => {
      void refresh();
      toast.success(suspending ? "Compte suspendu." : "Compte réactivé.");
      onClose();
      // The clicked button changes with the new status: give focus a home.
      requestAnimationFrame(focusList);
    },
  });

  const error = mutation.error;
  // Changed elsewhere (409), store closed (409) or gone (404): retrying cannot
  // succeed; the list reloads when the dialog closes.
  const settledElsewhere =
    isApiError(error) &&
    (error.error === "INVALID_STATUS_TRANSITION" || error.error === "STORE_CLOSED" || error.statusCode === 404);
  const fieldError = reasonError ?? apiFieldMessage(error, "reason");
  const generalError =
    mutation.isError && !fieldError ? (isApiError(error) ? error.message : UNEXPECTED_ERROR_MESSAGE) : null;

  // The one way to close (button, Escape, outside press); never mid-request.
  function close() {
    if (mutation.isPending) return;
    onClose();
    if (settledElsewhere) void refresh().then(focusList);
  }

  function submit() {
    if (suspending) {
      const parsed = reasonSchema.safeParse(reason);
      if (!parsed.success) {
        setReasonError(parsed.error.issues[0]?.message);
        document.getElementById(REASON_ID)?.focus();
        return;
      }
    }
    setReasonError(undefined);
    mutation.reset();
    mutation.mutate();
  }

  return (
    <AlertDialog open onOpenChange={(next) => !next && close()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {suspending ? "Suspendre" : "Réactiver"} le compte {account.number} ?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {suspending
              ? "Il ne prendra plus de dépôts ni de mouvements entre objectifs ; ses achats restent possibles. Les autres comptes du client ne changent pas. Le motif est visible du personnel de la quincaillerie, jamais du client."
              : "Les dépôts et les mouvements entre objectifs reprennent. Le motif de suspension est effacé."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <p className="text-[15px]">
          <span className="font-semibold">
            {account.customer.firstName} {account.customer.lastName}
          </span>
          <span className="block text-[13px] text-muted-ink">{account.store.name}</span>
        </p>

        {suspending && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={REASON_ID} className="text-[15px] font-semibold">
              Motif
            </label>
            <Textarea
              id={REASON_ID}
              value={reason}
              maxLength={REASON_MAX}
              rows={3}
              disabled={mutation.isPending || settledElsewhere}
              onChange={(event) => {
                setReason(event.target.value);
                if (reasonError) setReasonError(undefined);
              }}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? `${REASON_ID}-count ${REASON_ID}-error` : `${REASON_ID}-count`}
              className="text-[15px]"
            />
            <p id={`${REASON_ID}-count`} className="text-right text-[13px] text-muted-ink">
              {reason.trim().length} / {REASON_MAX}
            </p>
            {fieldError && (
              <p id={`${REASON_ID}-error`} role="alert" className="text-[14px] text-danger">
                {fieldError}
              </p>
            )}
          </div>
        )}

        {generalError && (
          <p role="alert" className="rounded-control bg-danger/10 px-4 py-3 text-[15px] text-danger">
            {generalError}
          </p>
        )}

        <AlertDialogFooter>
          <Button variant="secondary" disabled={mutation.isPending} onClick={close}>
            {settledElsewhere ? "Fermer la fenêtre" : "Annuler"}
          </Button>
          <Button
            variant={suspending ? "destructive" : "action"}
            disabled={mutation.isPending || settledElsewhere}
            onClick={submit}
          >
            {mutation.isPending ? "Enregistrement…" : suspending ? "Suspendre" : "Réactiver"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

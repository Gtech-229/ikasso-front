"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { ALERT_TYPE_LABELS, resolveAlert, type Alert } from "@/lib/api/alerts";
import { isApiError, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/format";
import { ALERTS_HEADING_ID } from "./alerts-table";

function focusList() {
  document.getElementById(ALERTS_HEADING_ID)?.focus();
}

/** Confirms, then marks the alert handled. No balance changes. */
export function ResolveAlertDialog({ alert, onClose }: { alert: Alert; onClose: () => void }) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["alerts"] });

  const mutation = useMutation({
    mutationFn: () => resolveAlert(alert.id),
    onSuccess: () => {
      void refresh();
      toast.success("Alerte marquée comme traitée.");
      onClose();
      // The clicked button is gone with the new state: give focus a home.
      requestAnimationFrame(focusList);
    },
  });

  const error = mutation.error;
  // Another admin handled it meanwhile (409) or it no longer exists (404):
  // retrying cannot succeed; the list reloads when the dialog closes.
  const settledElsewhere =
    isApiError(error) && (error.error === "ALERT_ALREADY_RESOLVED" || error.statusCode === 404);
  const message = mutation.isError ? (isApiError(error) ? error.message : UNEXPECTED_ERROR_MESSAGE) : null;

  // The one way to close (button, Escape, outside press); never mid-request.
  function close() {
    if (mutation.isPending) return;
    onClose();
    if (settledElsewhere) void refresh().then(focusList);
  }

  return (
    <AlertDialog open onOpenChange={(next) => !next && close()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Marquer cette alerte comme traitée ?</AlertDialogTitle>
          <AlertDialogDescription>
            Aucun solde ne change : une correction reste au gérant. Si l’écart est toujours là, la
            vérification de la nuit suivante créera une nouvelle alerte.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p className="text-[15px]">
          <span className="font-semibold">{ALERT_TYPE_LABELS[alert.type]}</span>
          {alert.store ? ` · ${alert.store.name}` : ""}
          <span className="block text-[13px] text-muted-ink">Détectée le {formatDateTime(alert.createdAt)}</span>
        </p>
        {message && (
          <p role="alert" className="rounded-control bg-danger/10 px-4 py-3 text-[15px] text-danger">
            {message}
          </p>
        )}
        <AlertDialogFooter>
          <Button variant="secondary" disabled={mutation.isPending} onClick={close}>
            {settledElsewhere ? "Fermer la fenêtre" : "Annuler"}
          </Button>
          <Button
            variant="action"
            disabled={mutation.isPending || settledElsewhere}
            onClick={() => {
              mutation.reset();
              mutation.mutate();
            }}
          >
            {mutation.isPending ? "Enregistrement…" : "Marquer comme traitée"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

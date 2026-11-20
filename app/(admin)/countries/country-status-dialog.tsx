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
import { activateCountry, countriesQueryKey, deactivateCountry, type Country } from "@/lib/api/countries";
import { isApiError, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import { COUNTRIES_HEADING_ID } from "./countries-view";

function focusList() {
  document.getElementById(COUNTRIES_HEADING_ID)?.focus();
}

/** Activates an inactive country or deactivates the active one, after a confirmation. */
export function CountryStatusDialog({ country, onClose }: { country: Country; onClose: () => void }) {
  const activating = !country.active;
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: countriesQueryKey });

  const mutation = useMutation({
    mutationFn: () => (activating ? activateCountry(country.code) : deactivateCountry(country.code)),
    onSuccess: () => {
      void refresh();
      toast.success(activating ? "Pays activé." : "Pays désactivé.");
      onClose();
      // The clicked button changes with the new state: give focus a home.
      requestAnimationFrame(focusList);
    },
  });

  const error = mutation.error;
  // Another country active, stores still open, or gone: retrying cannot
  // succeed; the list reloads when the dialog closes.
  const refused =
    isApiError(error) &&
    (error.error === "ANOTHER_COUNTRY_ACTIVE" || error.error === "COUNTRY_IN_USE" || error.statusCode === 404);
  const message = mutation.isError ? (isApiError(error) ? error.message : UNEXPECTED_ERROR_MESSAGE) : null;

  // The one way to close (button, Escape, outside press); never mid-request.
  function close() {
    if (mutation.isPending) return;
    onClose();
    if (refused) void refresh().then(focusList);
  }

  return (
    <AlertDialog open onOpenChange={(next) => !next && close()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {activating ? "Activer" : "Désactiver"} {country.name} ?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {activating
              ? "Les quincailleries pourront y être inscrites. Un seul pays peut être actif à la fois."
              : "Plus aucune quincaillerie ne pourra y être inscrite. Refusé tant qu’une de ses quincailleries n’est pas fermée."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {message && (
          <p role="alert" className="rounded-control bg-danger/10 px-4 py-3 text-[15px] text-danger">
            {message}
          </p>
        )}
        <AlertDialogFooter>
          <Button variant="secondary" disabled={mutation.isPending} onClick={close}>
            {refused ? "Fermer la fenêtre" : "Annuler"}
          </Button>
          <Button
            variant={activating ? "action" : "destructive"}
            disabled={mutation.isPending || refused}
            onClick={() => {
              mutation.reset();
              mutation.mutate();
            }}
          >
            {mutation.isPending ? "Enregistrement…" : activating ? "Activer" : "Désactiver"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

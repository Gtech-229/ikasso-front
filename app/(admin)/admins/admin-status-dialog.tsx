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
import { activateAdmin, adminsQueryKey, deactivateAdmin, type AdminSummary } from "@/lib/api/admins";
import { isApiError, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import { focusAdminsList } from "./admins-view";

/** Deactivates an active admin or reactivates a deactivated one, after a confirmation. */
export function AdminStatusDialog({ admin, onClose }: { admin: AdminSummary; onClose: () => void }) {
  const activating = !admin.isActive;
  const name = `${admin.firstName} ${admin.lastName}`;
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: adminsQueryKey });

  const mutation = useMutation({
    mutationFn: () => (activating ? activateAdmin(admin.id) : deactivateAdmin(admin.id)),
    onSuccess: () => {
      void refresh();
      toast.success(activating ? "Administrateur réactivé." : "Administrateur désactivé.");
      onClose();
      // The clicked button changes with the new state: give focus a home.
      requestAnimationFrame(focusAdminsList);
    },
  });

  const error = mutation.error;
  // Protected account or removed meanwhile: retrying cannot succeed; the list
  // reloads when the dialog closes.
  const refused = isApiError(error) && (error.statusCode === 403 || error.statusCode === 404);
  const message = mutation.isError ? (isApiError(error) ? error.message : UNEXPECTED_ERROR_MESSAGE) : null;

  // The one way to close (button, Escape, outside press); never mid-request.
  function close() {
    if (mutation.isPending) return;
    onClose();
    if (refused) void refresh().then(focusAdminsList);
  }

  return (
    <AlertDialog open onOpenChange={(next) => !next && close()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {activating ? "Réactiver" : "Désactiver"} {name} ?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {activating
              ? "Il pourra de nouveau se connecter."
              : "Il ne pourra plus se connecter et ses sessions sont fermées immédiatement."}
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
            {mutation.isPending ? "Enregistrement…" : activating ? "Réactiver" : "Désactiver"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

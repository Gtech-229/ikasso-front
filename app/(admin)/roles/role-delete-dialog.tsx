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
import { isApiError, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import { deleteRole, rolesQueryKey, type Role } from "@/lib/api/roles";
import { focusRolesList } from "./roles-view";

/** Deletes a role no admin holds, after a confirmation. */
export function RoleDeleteDialog({ role, onClose }: { role: Role; onClose: () => void }) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: rolesQueryKey });

  const mutation = useMutation({
    mutationFn: () => deleteRole(role.id),
    onSuccess: () => {
      void refresh();
      toast.success("Rôle supprimé.");
      onClose();
      requestAnimationFrame(focusRolesList);
    },
  });

  const error = mutation.error;
  // An admin got the role meanwhile, or it is gone: retrying cannot succeed;
  // the list reloads when the dialog closes.
  const refused = isApiError(error) && (error.error === "ROLE_IN_USE" || error.statusCode === 404);
  const message = mutation.isError ? (isApiError(error) ? error.message : UNEXPECTED_ERROR_MESSAGE) : null;

  // The one way to close (button, Escape, outside press); never mid-request.
  function close() {
    if (mutation.isPending) return;
    onClose();
    if (refused) void refresh().then(focusRolesList);
  }

  return (
    <AlertDialog open onOpenChange={(next) => !next && close()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer {role.name} ?</AlertDialogTitle>
          <AlertDialogDescription>Aucun administrateur n’a ce rôle. La suppression est définitive.</AlertDialogDescription>
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
            variant="destructive"
            disabled={mutation.isPending || refused}
            onClick={() => {
              mutation.reset();
              mutation.mutate();
            }}
          >
            {mutation.isPending ? "Suppression…" : "Supprimer"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

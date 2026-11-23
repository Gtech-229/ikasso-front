"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { roleFormSchema, type RoleFormValues } from "@/lib/admin-form";
import { adminsQueryKey, assignAdminRole, type AdminSummary } from "@/lib/api/admins";
import { isApiError } from "@/lib/api/errors";
import { rolesQueryKey, type Role } from "@/lib/api/roles";
import { SaveAlert, showSaveError } from "../stores/edit-support";
import { RoleSelect } from "./admin-form-dialog";
import { focusAdminsList } from "./admins-view";

/** Gives an admin another role; it applies from their next request. */
export function AdminRoleDialog({ admin, roles, onClose }: { admin: AdminSummary; roles: Role[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { roleId: admin.roleId ?? "" },
  });
  const [alert, setAlert] = useState<string | null>(null);
  const [unchanged, setUnchanged] = useState(false);

  useEffect(() => form.setFocus("roleId"), [form]);

  const mutation = useMutation({
    mutationFn: ({ roleId }: RoleFormValues) => assignAdminRole(admin.id, roleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminsQueryKey });
      // Each role's admin count changed.
      void queryClient.invalidateQueries({ queryKey: rolesQueryKey });
      toast.success("Rôle changé.");
      onClose();
      requestAnimationFrame(focusAdminsList);
    },
    onError: (error) => {
      // Admin or role removed meanwhile: reload both lists behind the message.
      if (isApiError(error) && error.statusCode === 404) {
        void queryClient.invalidateQueries({ queryKey: adminsQueryKey });
        void queryClient.invalidateQueries({ queryKey: rolesQueryKey });
      }
      setAlert(showSaveError(error, form, ["roleId"]));
    },
  });

  const submit = form.handleSubmit((values) => {
    setAlert(null);
    setUnchanged(false);
    if (values.roleId === admin.roleId) {
      setUnchanged(true);
      return;
    }
    mutation.mutate(values);
  });
  const pending = mutation.isPending;

  return (
    <Dialog open onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-[22px] font-bold">
            Rôle de {admin.firstName} {admin.lastName}
          </DialogTitle>
          <DialogDescription className="text-[14px]">
            Le nouveau rôle s’applique dès sa requête suivante, sans reconnexion.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <RoleSelect form={form} roles={roles} />
          <SaveAlert message={alert} />
          {unchanged && (
            <p role="status" className="text-[15px] text-muted-ink">
              Aucune modification.
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" variant="action" disabled={pending}>
              {pending ? "Enregistrement…" : "Changer le rôle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { isApiError } from "@/lib/api/errors";
import { createRole, rolesQueryKey, updateRole, type Role } from "@/lib/api/roles";
import { registerRechecking, useFieldError } from "@/lib/form-fields";
import { roleNameSchema, type RoleNameInput, type RoleNameValues } from "@/lib/role-form";
import { SaveAlert, showSaveError } from "../stores/edit-support";
import { focusRolesList } from "./roles-view";

/**
 * Creates a role (role null), with no permission yet, or renames one.
 * Permissions are set in the grid.
 */
export function RoleFormDialog({ role, onClose }: { role: Role | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  // Captured once: a refetch while the dialog is open must not move the baseline.
  const [initial] = useState(() => role);
  const form = useForm<RoleNameInput, unknown, RoleNameValues>({
    resolver: zodResolver(roleNameSchema),
    defaultValues: { name: initial?.name ?? "" },
  });
  const [alert, setAlert] = useState<string | null>(null);
  const [unchanged, setUnchanged] = useState(false);
  const nameError = useFieldError(form, "name");

  useEffect(() => form.setFocus("name"), [form]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: rolesQueryKey });

  const mutation = useMutation({
    mutationFn: ({ name }: RoleNameValues) =>
      initial ? updateRole(initial.id, { name }) : createRole({ name, permissions: [] }),
    onSuccess: () => {
      void refresh();
      toast.success(initial ? "Rôle renommé." : "Rôle créé : cochez ses permissions dans la grille.");
      onClose();
      requestAnimationFrame(focusRolesList);
    },
    onError: (error) => {
      if (isApiError(error) && error.error === "ROLE_NAME_TAKEN") {
        form.setError("name", { message: error.message }, { shouldFocus: true });
        return;
      }
      // Removed meanwhile: the list reloads behind the message.
      if (isApiError(error) && error.statusCode === 404) void refresh();
      setAlert(showSaveError(error, form, ["name"]));
    },
  });

  const submit = form.handleSubmit((values) => {
    setAlert(null);
    setUnchanged(false);
    if (initial && values.name === initial.name.trim()) {
      setUnchanged(true);
      return;
    }
    mutation.mutate(values);
  });
  const pending = mutation.isPending;

  return (
    // Never closed mid-request (Escape, outside press, the close button).
    <Dialog open onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-[22px] font-bold">
            {initial ? `Renommer ${initial.name}` : "Créer un rôle"}
          </DialogTitle>
          <DialogDescription className="text-[14px]">
            {initial
              ? "Ses administrateurs et ses permissions ne changent pas."
              : "Le rôle est créé sans permission ; cochez-les ensuite dans la grille."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <Field data-invalid={nameError ? true : undefined}>
            <FieldLabel htmlFor="role-name">Nom</FieldLabel>
            <Input
              id="role-name"
              autoComplete="off"
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? "role-name-error" : undefined}
              {...registerRechecking(form, "name")}
            />
            <FieldError id="role-name-error">{nameError}</FieldError>
          </Field>

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
              {pending ? "Enregistrement…" : initial ? "Renommer" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

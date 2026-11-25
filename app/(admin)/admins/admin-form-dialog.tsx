"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm, useWatch, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  adminChanges,
  adminDetails,
  createAdminFormSchema,
  editAdminFormSchema,
  type CreateAdminFormInput,
  type CreateAdminFormValues,
  type EditAdminFormInput,
  type EditAdminFormValues,
} from "@/lib/admin-form";
import { adminsQueryKey, createAdmin, updateAdmin, type AdminSummary } from "@/lib/api/admins";
import { isApiError } from "@/lib/api/errors";
import { requestPasswordLink } from "@/lib/api/password";
import { rolesQueryKey, type Role } from "@/lib/api/roles";
import { registerRechecking, useFieldError } from "@/lib/form-fields";
import { SaveAlert, showSaveError } from "../stores/edit-support";
import { focusAdminsList, roleOptions } from "./admins-view";

const DETAIL_FIELDS = ["email", "firstName", "lastName"] as const;
const LABELS = { email: "Email", firstName: "Prénom", lastName: "Nom" } as const;

/** Creates an admin (admin null) or corrects one's email and names. */
export function AdminFormDialog({
  admin,
  roles,
  onClose,
}: {
  admin: AdminSummary | null;
  roles: Role[];
  onClose: () => void;
}) {
  return admin ? (
    <EditDialog admin={admin} onClose={onClose} />
  ) : (
    <CreateDialog roles={roles} onClose={onClose} />
  );
}

function CreateDialog({ roles, onClose }: { roles: Role[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm<CreateAdminFormInput, unknown, CreateAdminFormValues>({
    resolver: zodResolver(createAdminFormSchema),
    defaultValues: { email: "", firstName: "", lastName: "", roleId: "" },
  });
  const [alert, setAlert] = useState<string | null>(null);

  useEffect(() => form.setFocus("email"), [form]);

  const mutation = useMutation({
    mutationFn: (values: CreateAdminFormValues) => createAdmin(values),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: adminsQueryKey });
      onClose();
      requestAnimationFrame(focusAdminsList);
      // The API sends no email at creation: ask for the first-password link.
      requestPasswordLink("set", created.email)
        .then((message) => toast.success(`Administrateur créé. ${message}`))
        .catch(() =>
          toast.error("Administrateur créé, mais le lien n’a pas pu être envoyé : utilisez « Envoyer le lien »."),
        );
    },
    onError: (error) => {
      if (isApiError(error) && error.error === "EMAIL_ALREADY_USED") {
        form.setError("email", { message: error.message }, { shouldFocus: true });
        return;
      }
      // F-06: the role was deleted meanwhile (404): reload the roles so the
      // select drops it, and the admins list, as the edit dialog does.
      if (isApiError(error) && error.statusCode === 404) {
        void queryClient.invalidateQueries({ queryKey: rolesQueryKey });
        void queryClient.invalidateQueries({ queryKey: adminsQueryKey });
      }
      setAlert(showSaveError(error, form, [...DETAIL_FIELDS, "roleId"]));
    },
  });

  const submit = form.handleSubmit((values) => {
    setAlert(null);
    mutation.mutate(values);
  });
  const pending = mutation.isPending;

  return (
    <Dialog open onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-[22px] font-bold">Créer un administrateur</DialogTitle>
          <DialogDescription className="text-[14px]">
            Il recevra par email un lien pour choisir son mot de passe, valable 3 jours.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <TextField form={form} name="email" label={LABELS.email} type="email" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField form={form} name="firstName" label={LABELS.firstName} />
            <TextField form={form} name="lastName" label={LABELS.lastName} />
          </div>
          <RoleSelect form={form} roles={roles} />
          <SaveAlert message={alert} />
          <Footer pending={pending} onClose={onClose} label="Créer" pendingLabel="Création…" />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ admin, onClose }: { admin: AdminSummary; onClose: () => void }) {
  const queryClient = useQueryClient();
  // Captured once: a refetch while the dialog is open must not move the baseline.
  const [initial] = useState(() => admin);
  const form = useForm<EditAdminFormInput, unknown, EditAdminFormValues>({
    resolver: zodResolver(editAdminFormSchema),
    defaultValues: adminDetails(initial),
  });
  const [alert, setAlert] = useState<string | null>(null);
  const [unchanged, setUnchanged] = useState(false);
  const email = useWatch({ control: form.control, name: "email" });
  const emailChanged = email.trim().toLowerCase() !== initial.email;

  useEffect(() => form.setFocus("email"), [form]);

  const mutation = useMutation({
    mutationFn: (values: EditAdminFormValues) => updateAdmin(initial.id, adminChanges(initial, values)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminsQueryKey });
      toast.success("Administrateur modifié.");
      onClose();
      requestAnimationFrame(focusAdminsList);
    },
    onError: (error) => {
      if (isApiError(error) && error.error === "EMAIL_ALREADY_USED") {
        form.setError("email", { message: error.message }, { shouldFocus: true });
        return;
      }
      // Removed meanwhile: the list reloads behind the message.
      if (isApiError(error) && error.statusCode === 404) {
        void queryClient.invalidateQueries({ queryKey: adminsQueryKey });
      }
      setAlert(showSaveError(error, form, [...DETAIL_FIELDS]));
    },
  });

  const submit = form.handleSubmit((values) => {
    setAlert(null);
    setUnchanged(false);
    if (Object.keys(adminChanges(initial, values)).length === 0) {
      setUnchanged(true);
      return;
    }
    mutation.mutate(values);
  });
  const pending = mutation.isPending;

  return (
    <Dialog open onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-[22px] font-bold">
            Modifier {initial.firstName} {initial.lastName}
          </DialogTitle>
          <DialogDescription className="text-[14px]">Seuls les champs modifiés sont enregistrés.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <TextField
            form={form}
            name="email"
            label={LABELS.email}
            type="email"
            hint={
              emailChanged
                ? "Avec un nouvel email, les liens de mot de passe non utilisés ne valent plus : envoyez-en un nouveau si besoin."
                : undefined
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField form={form} name="firstName" label={LABELS.firstName} />
            <TextField form={form} name="lastName" label={LABELS.lastName} />
          </div>
          <SaveAlert message={alert} />
          {unchanged && (
            <p role="status" className="text-[15px] text-muted-ink">
              Aucune modification.
            </p>
          )}
          <Footer pending={pending} onClose={onClose} label="Enregistrer" pendingLabel="Enregistrement…" />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Footer({
  pending,
  onClose,
  label,
  pendingLabel,
}: {
  pending: boolean;
  onClose: () => void;
  label: string;
  pendingLabel: string;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>
        Annuler
      </Button>
      <Button type="submit" variant="action" disabled={pending}>
        {pending ? pendingLabel : label}
      </Button>
    </div>
  );
}

function TextField<T extends FieldValues>({
  form,
  name,
  label,
  type = "text",
  hint,
}: {
  form: UseFormReturn<T, unknown, FieldValues>;
  name: Path<T>;
  label: string;
  type?: "text" | "email";
  hint?: string;
}) {
  const id = `admin-${name}`;
  // The form's output type differs from its input; the field helpers only read and register.
  const fields = form as unknown as UseFormReturn<T>;
  const message = useFieldError(fields, name);
  const describedBy = [hint ? `${id}-hint` : null, message ? `${id}-error` : null].filter(Boolean).join(" ");
  return (
    <Field data-invalid={message ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type={type}
        autoComplete="off"
        aria-invalid={message ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...registerRechecking(fields, name)}
      />
      {hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
      <FieldError id={`${id}-error`}>{message}</FieldError>
    </Field>
  );
}

/** The role select, shared with the change-role dialog. */
export function RoleSelect<T extends FieldValues & { roleId: string }>({
  form,
  roles,
}: {
  form: UseFormReturn<T, unknown, FieldValues>;
  roles: Role[];
}) {
  const name = "roleId" as Path<T>;
  const fields = form as unknown as UseFormReturn<T>;
  const message = useFieldError(fields, name);
  return (
    <Field data-invalid={message ? true : undefined}>
      <FieldLabel htmlFor="admin-roleId">Rôle</FieldLabel>
      <select
        id="admin-roleId"
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? "admin-roleId-error" : undefined}
        className="min-h-11 w-full rounded-control border border-border bg-surface px-3 text-[15px] text-ink focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        {...registerRechecking(fields, name)}
      >
        <option value="">Choisir un rôle</option>
        {roleOptions(roles).map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </select>
      <FieldError id="admin-roleId-error">{message}</FieldError>
    </Field>
  );
}

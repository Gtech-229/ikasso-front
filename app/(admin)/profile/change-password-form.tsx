"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordRules } from "@/components/password-rules";
import { isApiError, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import { apiFieldMessage } from "@/lib/api/field-errors";
import {
  changePassword,
  PASSWORDS_DIFFER_MESSAGE,
  passwordSchema,
} from "@/lib/api/password";

const schema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { error: "Le mot de passe actuel est requis" })
      .max(128, { error: "Le mot de passe actuel est trop long" }),
    newPassword: passwordSchema,
    confirm: z.string(),
  })
  .refine((values) => values.newPassword === values.confirm, {
    path: ["confirm"],
    error: PASSWORDS_DIFFER_MESSAGE,
  });

type Values = z.infer<typeof schema>;

const WRONG_PASSWORD = "INVALID_CREDENTIALS";
const EMPTY: Values = { currentPassword: "", newPassword: "", confirm: "" };

export function ChangePasswordForm() {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const mutation = useMutation({
    mutationFn: (values: Values) => changePassword(values.currentPassword, values.newPassword),
    onSuccess: () => {
      toast.success("Mot de passe modifié. Vos autres sessions ont été fermées.");
      form.reset(EMPTY);
    },
    onError: (error) => {
      if (isApiError(error) && error.error === WRONG_PASSWORD) {
        form.resetField("currentPassword");
        form.setFocus("currentPassword");
      }
    },
  });

  const { errors } = form.formState;
  const error = mutation.error;
  const wrongPassword = isApiError(error) && error.error === WRONG_PASSWORD;
  const currentError =
    errors.currentPassword?.message ??
    (wrongPassword ? error.message : apiFieldMessage(error, "currentPassword"));
  // A 400 without details is the "same as the current password" refusal.
  const newError =
    errors.newPassword?.message ??
    apiFieldMessage(error, "newPassword") ??
    (isApiError(error) && error.statusCode === 400 && error.details.length === 0
      ? error.message
      : undefined);
  const generalError =
    mutation.isError && !currentError && !newError
      ? isApiError(error)
        ? error.message
        : UNEXPECTED_ERROR_MESSAGE
      : null;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => {
        mutation.reset();
        mutation.mutate(values);
      })}
    >
      <FieldGroup>
        <Field data-invalid={currentError ? true : undefined}>
          <FieldLabel htmlFor="currentPassword">Mot de passe actuel</FieldLabel>
          <PasswordInput
            id="currentPassword"
            autoComplete="current-password"
            aria-invalid={currentError ? true : undefined}
            aria-describedby={currentError ? "current-error" : undefined}
            {...form.register("currentPassword")}
          />
          <FieldError id="current-error">{currentError}</FieldError>
        </Field>
        <Field data-invalid={newError ? true : undefined}>
          <FieldLabel htmlFor="newPassword">Nouveau mot de passe</FieldLabel>
          <PasswordInput
            id="newPassword"
            autoComplete="new-password"
            aria-invalid={newError ? true : undefined}
            aria-describedby={newError ? "new-rule new-error" : "new-rule"}
            {...form.register("newPassword")}
          />
          <PasswordRules control={form.control} name="newPassword" id="new-rule" />
          <FieldError id="new-error">{newError}</FieldError>
        </Field>
        <Field data-invalid={errors.confirm ? true : undefined}>
          <FieldLabel htmlFor="confirm">Confirmer le nouveau mot de passe</FieldLabel>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            aria-invalid={errors.confirm ? true : undefined}
            aria-describedby={errors.confirm ? "confirm-error" : undefined}
            {...form.register("confirm")}
          />
          <FieldError id="confirm-error" errors={[errors.confirm]} />
        </Field>
        {generalError && (
          <p
            role="alert"
            className="rounded-control bg-danger/10 px-4 py-3 text-[15px] text-danger"
          >
            {generalError}
          </p>
        )}
        <div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Enregistrement…" : "Changer le mot de passe"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

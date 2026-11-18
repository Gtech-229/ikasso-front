"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthHeading } from "@/components/auth-layout";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordRules } from "@/components/password-rules";
import { isApiError, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import { apiFieldMessage } from "@/lib/api/field-errors";
import {
  isPasswordLinkMode,
  PASSWORDS_DIFFER_MESSAGE,
  passwordSchema,
  type PasswordLinkMode,
  requestPasswordLink,
  resetPassword,
} from "@/lib/api/password";

const COPY: Record<
  PasswordLinkMode,
  { requestTitle: string; requestIntro: string; chooseTitle: string; chooseIntro: string }
> = {
  set: {
    requestTitle: "Définir mon mot de passe",
    requestIntro:
      "Indiquez votre adresse email : nous vous enverrons un lien pour choisir votre premier mot de passe.",
    chooseTitle: "Choisir mon mot de passe",
    chooseIntro: "Choisissez le mot de passe de votre compte administrateur.",
  },
  reset: {
    requestTitle: "Mot de passe oublié",
    requestIntro:
      "Indiquez votre adresse email : nous vous enverrons un lien pour choisir un nouveau mot de passe.",
    chooseTitle: "Nouveau mot de passe",
    chooseIntro: "Choisissez un nouveau mot de passe pour votre compte.",
  },
};

const INVALID_LINK = "INVALID_PASSWORD_TOKEN";

function apiMessageOf(error: unknown): string {
  return isApiError(error) ? error.message : UNEXPECTED_ERROR_MESSAGE;
}

export function PasswordFlow() {
  const params = useSearchParams();
  const mode = params.get("mode");
  const token = params.get("token");

  if (!isPasswordLinkMode(mode)) return <IncompleteLink />;
  return token ? <ChoosePassword mode={mode} token={token} /> : <RequestLink mode={mode} />;
}

function BackToLogin() {
  return (
    <Link
      href="/login"
      className="flex min-h-11 items-center justify-center text-[15px] font-semibold underline-offset-4 hover:underline"
    >
      Retour à la connexion
    </Link>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="rounded-control bg-danger/10 px-4 py-3 text-[15px] text-danger">
      {children}
    </div>
  );
}

function IncompleteLink() {
  return (
    <>
      <AuthHeading
        title="Lien incomplet"
        intro="Ce lien ne contient pas toutes les informations nécessaires."
      />
      <BackToLogin />
    </>
  );
}

const requestSchema = z.object({
  email: z.string().trim().pipe(z.email({ error: "L’adresse email est invalide" })),
});

function RequestLink({ mode }: { mode: PasswordLinkMode }) {
  const form = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: "" },
  });
  const mutation = useMutation({
    mutationFn: ({ email }: z.infer<typeof requestSchema>) => requestPasswordLink(mode, email),
  });
  const copy = COPY[mode];

  if (mutation.isSuccess) {
    return (
      <>
        <AuthHeading title={copy.requestTitle} intro="Consultez votre boîte de réception." />
        <p role="status" className="mb-4 rounded-control bg-canvas px-4 py-3 text-[15px]">
          {mutation.data}
        </p>
        <BackToLogin />
      </>
    );
  }

  const emailError = form.formState.errors.email?.message ?? apiFieldMessage(mutation.error, "email");
  const generalError = mutation.isError && !emailError ? apiMessageOf(mutation.error) : null;

  return (
    <>
      <AuthHeading title={copy.requestTitle} intro={copy.requestIntro} />
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => {
          mutation.reset();
          mutation.mutate(values);
        })}
      >
        <FieldGroup>
          <Field data-invalid={emailError ? true : undefined}>
            <FieldLabel htmlFor="email">Adresse email</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? "email-error" : undefined}
              {...form.register("email")}
            />
            <FieldError id="email-error">{emailError}</FieldError>
          </Field>
          {generalError && <Alert>{generalError}</Alert>}
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Envoi…" : "Recevoir le lien"}
          </Button>
          <BackToLogin />
        </FieldGroup>
      </form>
    </>
  );
}

const chooseSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((values) => values.password === values.confirm, {
    path: ["confirm"],
    error: PASSWORDS_DIFFER_MESSAGE,
  });

function ChoosePassword({ mode, token }: { mode: PasswordLinkMode; token: string }) {
  const form = useForm<z.infer<typeof chooseSchema>>({
    resolver: zodResolver(chooseSchema),
    defaultValues: { password: "", confirm: "" },
  });
  const mutation = useMutation({
    mutationFn: ({ password }: z.infer<typeof chooseSchema>) => resetPassword(token, password),
  });
  const copy = COPY[mode];

  if (mutation.isSuccess) {
    return (
      <>
        <AuthHeading title={copy.chooseTitle} intro="C’est fait." />
        <p role="status" className="mb-6 rounded-control bg-canvas px-4 py-3 text-[15px]">
          Mot de passe enregistré. Connectez-vous avec votre nouveau mot de passe.
        </p>
        <Link href="/login" className={buttonVariants({ className: "w-full" })}>
          Se connecter
        </Link>
      </>
    );
  }

  const { errors } = form.formState;
  const passwordError = errors.password?.message ?? apiFieldMessage(mutation.error, "password");
  const linkInvalid = isApiError(mutation.error) && mutation.error.error === INVALID_LINK;
  const generalError =
    mutation.isError && !passwordError ? apiMessageOf(mutation.error) : null;

  return (
    <>
      <AuthHeading title={copy.chooseTitle} intro={copy.chooseIntro} />
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => {
          mutation.reset();
          mutation.mutate(values);
        })}
      >
        <FieldGroup>
          <Field data-invalid={passwordError ? true : undefined}>
            <FieldLabel htmlFor="password">Nouveau mot de passe</FieldLabel>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              aria-invalid={passwordError ? true : undefined}
              aria-describedby={passwordError ? "password-rule password-error" : "password-rule"}
              {...form.register("password")}
            />
            <PasswordRules control={form.control} name="password" id="password-rule" />
            <FieldError id="password-error">{passwordError}</FieldError>
          </Field>
          <Field data-invalid={errors.confirm ? true : undefined}>
            <FieldLabel htmlFor="confirm">Confirmer le mot de passe</FieldLabel>
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
            <Alert>
              <p>{generalError}</p>
              {linkInvalid && (
                <Link
                  href={`/password?mode=${mode}`}
                  className="mt-2 inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
                >
                  Demander un nouveau lien
                </Link>
              )}
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Enregistrement…" : "Enregistrer mon mot de passe"}
          </Button>
        </FieldGroup>
      </form>
    </>
  );
}

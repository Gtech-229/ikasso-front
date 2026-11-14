"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { login, loginInputSchema, type LoginInput } from "@/lib/api/admin-auth";
import { refreshSession } from "@/lib/api/client";
import { isApiError, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import { safeNextPath } from "@/lib/auth/next-path";

function openNext(next: string): void {
  // A full page load on purpose: the server renders with the new cookies and
  // nothing from before sign-in stays in memory.
  window.location.replace(next);
}

export function LoginPending() {
  return (
    <p role="status" className="py-10 text-center text-[15px] text-muted-ink">
      Vérification de la session…
    </p>
  );
}

export function LoginForm() {
  const next = safeNextPath(useSearchParams().get("next"));
  // An idle admin lands here when only the access cookie expired: a still valid
  // refresh cookie brings them straight back, without the form.
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    refreshSession().then((outcome) => {
      if (!active) return;
      if (outcome === "refreshed") openNext(next);
      else setChecking(false);
    });
    return () => {
      active = false;
    };
  }, [next]);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: () => openNext(next),
    onError: () => {
      form.resetField("password");
      form.setFocus("password");
    },
  });

  if (checking) return <LoginPending />;

  const { errors } = form.formState;
  const apiMessage = mutation.isError
    ? isApiError(mutation.error)
      ? mutation.error.message
      : UNEXPECTED_ERROR_MESSAGE
    : null;
  // Stays disabled after success while the next page loads.
  const busy = mutation.isPending || mutation.isSuccess;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => {
        mutation.reset();
        mutation.mutate(values);
      })}
    >
      <FieldGroup>
        <Field data-invalid={errors.email ? true : undefined}>
          <FieldLabel htmlFor="email">Adresse email</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...form.register("email")}
          />
          <FieldError id="email-error" errors={[errors.email]} />
        </Field>

        <Field data-invalid={errors.password ? true : undefined}>
          <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...form.register("password")}
          />
          <FieldError id="password-error" errors={[errors.password]} />
        </Field>

        {apiMessage && (
          <p
            role="alert"
            className="rounded-control bg-danger/10 px-4 py-3 text-[15px] text-danger"
          >
            {apiMessage}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Connexion…" : "Se connecter"}
        </Button>

        <nav aria-label="Mot de passe" className="flex flex-col items-center">
          <Link
            href="/password?mode=reset"
            className="flex min-h-11 items-center text-[15px] font-semibold underline-offset-4 hover:underline"
          >
            Mot de passe oublié ?
          </Link>
          <Link
            href="/password?mode=set"
            className="flex min-h-11 items-center text-[15px] text-muted-ink underline-offset-4 hover:underline"
          >
            Première connexion ? Définir mon mot de passe
          </Link>
        </nav>
      </FieldGroup>
    </form>
  );
}

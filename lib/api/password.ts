import { z } from "zod";
import { apiFetch } from "./client";

/** `set`: first password (none yet). `reset`: forgotten password. */
export const PASSWORD_LINK_MODES = ["set", "reset"] as const;
export type PasswordLinkMode = (typeof PASSWORD_LINK_MODES)[number];

export function isPasswordLinkMode(value: string | null): value is PasswordLinkMode {
  return value === "set" || value === "reset";
}

export interface PasswordRule {
  id: string;
  /** Checklist text, shown while typing. */
  label: string;
  /** Error message when the rule fails. */
  message: string;
  test: (value: string) => boolean;
}

// Together these are the API's rule (backend src/common/validation/password.ts):
// 8 to 128 characters with a lowercase, an uppercase, a digit and a character
// that is neither. Unicode classes, so accented letters count as letters, and
// length counts characters (code points), like the API's `u` regex.
export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: "length",
    label: "Entre 8 et 128 caractères",
    message: "Le mot de passe doit contenir entre 8 et 128 caractères",
    test: (value) => {
      const length = [...value].length;
      return length >= 8 && length <= 128;
    },
  },
  {
    id: "lowercase",
    label: "Une lettre minuscule",
    message: "Le mot de passe doit contenir une lettre minuscule",
    test: (value) => /\p{Ll}/u.test(value),
  },
  {
    id: "uppercase",
    label: "Une lettre majuscule",
    message: "Le mot de passe doit contenir une lettre majuscule",
    test: (value) => /\p{Lu}/u.test(value),
  },
  {
    id: "digit",
    label: "Un chiffre",
    message: "Le mot de passe doit contenir un chiffre",
    test: (value) => /\p{Nd}/u.test(value),
  },
  {
    id: "special",
    label: "Un caractère spécial (ni lettre ni chiffre)",
    message: "Le mot de passe doit contenir un caractère spécial",
    test: (value) => /[^\p{L}\p{N}]/u.test(value),
  },
];

/** One issue per failed rule, each with its own message. */
export const passwordSchema = z.string().superRefine((value, ctx) => {
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(value)) ctx.addIssue({ code: "custom", message: rule.message });
  }
});

export const PASSWORDS_DIFFER_MESSAGE = "Les mots de passe ne correspondent pas";

const linkRequestedSchema = z.object({ message: z.string() });

/** Emails a link if the account fits the mode; the answer never says whether it did. */
export async function requestPasswordLink(mode: PasswordLinkMode, email: string): Promise<string> {
  const { message } = await apiFetch(`/admin/auth/forgot-password?mode=${mode}`, {
    method: "POST",
    body: { email },
    schema: linkRequestedSchema,
  });
  return message;
}

/** Uses an emailed link's token; every session of that admin ends. */
export function resetPassword(token: string, password: string): Promise<void> {
  return apiFetch("/admin/auth/reset-password", { method: "POST", body: { token, password } });
}

/** Signed in: other sessions end, this one stays open. */
export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return apiFetch("/admin/auth/password", {
    method: "PATCH",
    body: { currentPassword, newPassword },
  });
}

import { z } from "zod";
import { apiFetch } from "./client";

/** The signed-in admin, from `GET /admin/auth/me`. */
export const currentAdminSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum(["SUPER_ADMIN", "ADMIN"]),
  hasPassword: z.boolean(),
  // Plain strings: a permission added by the API must not break parsing.
  permissions: z.array(z.string()),
});

export type CurrentAdmin = z.infer<typeof currentAdminSchema>;

export const currentAdminQueryKey = ["admin", "me"] as const;

export const ME_PATH = "/admin/auth/me";

/** Same rules as the API's LoginDto, so most mistakes never leave the browser. */
export const loginInputSchema = z.object({
  email: z.string().trim().pipe(z.email({ error: "L’adresse email est invalide" })),
  password: z
    .string()
    .min(1, { error: "Le mot de passe est requis" })
    .max(128, { error: "Le mot de passe est trop long" }),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

/** Sets the session cookies; the response profile is not needed (full reload). */
export function login(input: LoginInput): Promise<void> {
  return apiFetch("/admin/auth/login", { method: "POST", body: input });
}

export function logout(): Promise<void> {
  return apiFetch("/admin/auth/logout", { method: "POST" });
}

export function fetchCurrentAdmin(): Promise<CurrentAdmin> {
  return apiFetch(ME_PATH, { schema: currentAdminSchema });
}

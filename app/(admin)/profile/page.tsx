import type { Metadata } from "next";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Mon profil · Ikasso Administration" };

const ROLE_LABELS = { SUPER_ADMIN: "Super administrateur", ADMIN: "Administrateur" } as const;

export default async function ProfilePage() {
  const admin = await getCurrentAdmin();
  return (
    <div className="flex flex-col gap-5 p-5 md:p-8">
      <h1 className="font-display text-[32px] leading-tight font-bold">Mon profil</h1>

      <section aria-labelledby="identity" className="max-w-xl rounded-card bg-surface p-6">
        <h2 id="identity" className="mb-4 font-display text-[22px] font-bold">
          Identité
        </h2>
        <dl className="grid gap-3 text-[15px] sm:grid-cols-[10rem_1fr]">
          <dt className="text-muted-ink">Nom</dt>
          <dd className="font-semibold">
            {admin.firstName} {admin.lastName}
          </dd>
          <dt className="text-muted-ink">Adresse email</dt>
          <dd className="break-all">{admin.email}</dd>
          <dt className="text-muted-ink">Rôle</dt>
          <dd>{ROLE_LABELS[admin.role]}</dd>
        </dl>
      </section>

      <section aria-labelledby="password" className="max-w-xl rounded-card bg-surface p-6">
        <h2 id="password" className="mb-1 font-display text-[22px] font-bold">
          Mot de passe
        </h2>
        <p className="mb-5 text-[15px] text-muted-ink">
          Vos autres sessions sont fermées après le changement ; celle-ci reste ouverte.
        </p>
        <ChangePasswordForm />
      </section>
    </div>
  );
}

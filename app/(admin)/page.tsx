import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { SignOutButton } from "./sign-out-button";

const ROLE_LABELS = { SUPER_ADMIN: "Super administrateur", ADMIN: "Administrateur" } as const;

// Placeholder home until the admin shell (feature 3) and the first pages.
export default async function HomePage() {
  const admin = await getCurrentAdmin();
  return (
    <main className="flex flex-1 items-center justify-center p-5">
      <section className="w-full max-w-xl overflow-hidden rounded-card-strong bg-ink text-surface">
        <div className="flex flex-col gap-4 p-8">
          <h1 className="font-display text-[32px] leading-tight font-bold">
            Bonjour {admin.firstName}
          </h1>
          <p className="text-[15px] text-surface/70">
            {admin.email} · {ROLE_LABELS[admin.role]}
          </p>
          <div>
            <SignOutButton />
          </div>
        </div>
        <div className="stripe h-3" />
      </section>
    </main>
  );
}

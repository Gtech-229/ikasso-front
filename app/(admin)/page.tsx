import { ROLE_LABELS } from "@/lib/api/admin-auth";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { visibleNav } from "@/lib/nav";

// Home until the landing page is decided (open plan question).
export default async function HomePage() {
  const admin = await getCurrentAdmin();
  const noSection = visibleNav(admin).length === 0;
  return (
    <div className="p-5 md:p-8">
      <section className="max-w-xl overflow-hidden rounded-card-strong bg-ink text-surface">
        <div className="flex flex-col gap-4 p-8">
          <h1 className="font-display text-[32px] leading-tight font-bold">
            Bonjour {admin.firstName}
          </h1>
          <p className="text-[15px] text-surface/70">
            {admin.email} · {ROLE_LABELS[admin.role]}
          </p>
          {noSection && (
            <p className="text-[15px] text-surface">
              Aucune section n’est ouverte à votre rôle. Demandez l’accès à un super
              administrateur.
            </p>
          )}
        </div>
        <div className="stripe h-3" />
      </section>
    </div>
  );
}

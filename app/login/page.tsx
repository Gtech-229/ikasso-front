import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm, LoginPending } from "./login-form";

export const metadata: Metadata = {
  title: "Connexion · Ikasso Administration",
};

// Mockup 45: dark brick panel with the tagline on the left, form on the right.
export default function LoginPage() {
  return (
    <main className="grid flex-1 md:grid-cols-2">
      <section
        aria-hidden="true"
        className="relative hidden flex-col justify-between overflow-hidden bg-ink p-10 text-surface md:flex"
      >
        <div className="bricks absolute inset-0 opacity-60" />
        <Wordmark className="relative" />
        <div className="relative flex flex-col gap-4">
          <p className="max-w-md font-display text-[36px] leading-tight font-bold">
            L’administration de la plateforme Ikasso.
          </p>
          <p className="max-w-md text-[15px] text-surface/70">
            Vérifier les quincailleries, suivre les abonnements et surveiller que
            tout se passe bien.
          </p>
        </div>
        <div className="stripe absolute inset-x-0 bottom-0 h-3" />
      </section>

      <section className="flex items-center justify-center bg-canvas p-5">
        <div className="w-full max-w-md rounded-card-strong bg-surface p-8 shadow-sm">
          <Wordmark className="mb-8 md:hidden" />
          <h1 className="font-display text-[32px] leading-tight font-bold">Connexion</h1>
          <p className="mt-2 mb-6 text-[15px] text-muted-ink">
            Espace réservé à l’équipe Ikasso.
          </p>
          <Suspense fallback={<LoginPending />}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

function Wordmark({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <span className="flex size-10 items-center justify-center rounded-control bg-brand font-display text-lg font-bold text-ink">
        I
      </span>
      <span className="font-display text-xl font-bold">Ikasso</span>
    </div>
  );
}

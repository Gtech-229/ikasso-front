import { Wordmark } from "@/components/wordmark";

/**
 * Mockup 45, shared by sign-in and the password pages: dark brick panel with
 * the tagline on the left, the form card on the right.
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
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
          {children}
        </div>
      </section>
    </main>
  );
}

/** Card title and intro, same look on every auth page. */
export function AuthHeading({ title, intro }: { title: string; intro: string }) {
  return (
    <>
      <h1 className="font-display text-[32px] leading-tight font-bold">{title}</h1>
      <p className="mt-2 mb-6 text-[15px] text-muted-ink">{intro}</p>
    </>
  );
}

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/**
 * A page or data the admin's role may not open (UI rule or API 403).
 * `embedded`: inside a page that already has its title and padding, so a
 * sub-heading and no outer spacing.
 */
export function Forbidden({ embedded = false }: { embedded?: boolean }) {
  const Heading = embedded ? "h2" : "h1";
  return (
    <div className={embedded ? undefined : "p-5 md:p-8"}>
      <section
        role="alert"
        className="flex max-w-md flex-col items-start gap-4 rounded-card bg-surface p-8"
      >
        <Heading className="font-display text-[22px] font-bold">Accès refusé</Heading>
        <p className="text-[15px] text-muted-ink">Votre rôle ne permet pas d’ouvrir cette page.</p>
        {/* A real link styled as a button: announced as a link. */}
        <Link href="/" className={buttonVariants({ variant: "secondary" })}>
          Retour à l’accueil
        </Link>
      </section>
    </div>
  );
}

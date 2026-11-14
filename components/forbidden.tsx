import Link from "next/link";
import { Button } from "@/components/ui/button";

/** A page or data the admin's role may not open (UI rule or API 403). */
export function Forbidden() {
  return (
    <div className="p-5 md:p-8">
      <section
        role="alert"
        className="flex max-w-md flex-col items-start gap-4 rounded-card bg-surface p-8"
      >
        <h1 className="font-display text-[22px] font-bold">Accès refusé</h1>
        <p className="text-[15px] text-muted-ink">Votre rôle ne permet pas d’ouvrir cette page.</p>
        <Button variant="secondary" render={<Link href="/" />} nativeButton={false}>
          Retour à l’accueil
        </Button>
      </section>
    </div>
  );
}

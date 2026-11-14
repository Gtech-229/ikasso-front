import Link from "next/link";
import { Button } from "@/components/ui/button";

// Unknown paths and sections not built yet, inside the shell.
export default function AdminNotFound() {
  return (
    <div className="p-5 md:p-8">
      <section className="flex max-w-md flex-col items-start gap-4 rounded-card bg-surface p-8">
        <h1 className="font-display text-[22px] font-bold">Page introuvable</h1>
        <p className="text-[15px] text-muted-ink">Cette page n’existe pas ou n’est pas encore disponible.</p>
        <Button variant="secondary" render={<Link href="/" />} nativeButton={false}>
          Retour à l’accueil
        </Button>
      </section>
    </div>
  );
}

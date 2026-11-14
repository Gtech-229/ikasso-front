"use client";

import { Button } from "@/components/ui/button";

// Unexpected failures on any page (API down, bad response), including the
// protected layout's session check: it lives here because a boundary never
// catches its own layout. An expired session redirects to login before
// reaching it. The raw error is never shown.
export default function RouteError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="flex flex-1 items-center justify-center p-5">
      <section
        role="alert"
        className="flex w-full max-w-md flex-col items-start gap-4 rounded-card bg-surface p-8"
      >
        <h1 className="font-display text-[22px] font-bold">Une erreur est survenue</h1>
        <p className="text-[15px] text-muted-ink">
          La page n’a pas pu être chargée. Réessayez dans un instant.
        </p>
        <Button onClick={() => retry()}>Réessayer</Button>
      </section>
    </main>
  );
}

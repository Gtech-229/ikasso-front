import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { healthQueryKey, healthSchema } from "@/lib/api/health";
import { serverFetch } from "@/lib/api/server";
import { getQueryClient } from "@/lib/query/get-query-client";
import { ApiStatus } from "./api-status";

// Placeholder until sign-in (feature 2) and the admin shell (feature 3).
export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-5">
      <section className="w-full max-w-xl overflow-hidden rounded-card-strong bg-ink text-surface">
        <div className="flex flex-col gap-6 p-8">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-control bg-brand font-display text-lg font-bold text-ink">
              I
            </span>
            <span className="font-display text-xl font-bold">Ikasso</span>
          </div>
          <h1 className="font-display text-[32px] leading-tight font-bold">
            L’administration de la plateforme.
          </h1>
          <p className="text-[15px] text-surface/70">
            Vérifier les quincailleries, suivre les abonnements et surveiller que
            tout se passe bien.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="action">Se connecter</Button>
            <Button variant="secondary">Mot de passe oublié</Button>
          </div>
        </div>
        <div className="stripe h-3" />
      </section>
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2">
        <Suspense fallback={<p className="text-sm text-muted-foreground">API : vérification…</p>}>
          <PrefetchedApiStatus />
        </Suspense>
      </div>
    </main>
  );
}

async function PrefetchedApiStatus() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: healthQueryKey,
    queryFn: () => serverFetch("/health", { schema: healthSchema }),
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ApiStatus />
    </HydrationBoundary>
  );
}

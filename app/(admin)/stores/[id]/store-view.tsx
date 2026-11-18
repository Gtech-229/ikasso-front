"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Forbidden } from "@/components/forbidden";
import { StatusPill, STORE_STATUS_TONES, SUBSCRIPTION_STATE_TONES } from "@/components/status-pill";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isApiError, isForbidden, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import {
  fetchStoreDetail,
  PLAN_LABELS,
  STORE_STATUS_LABELS,
  storeDetailQueryKey,
  SUBSCRIPTION_STATE_LABELS,
  type StoreDetail,
} from "@/lib/api/stores";
import { formatDate, formatMoney } from "@/lib/format";
import { LifecycleActions } from "./lifecycle-actions";

export function StoreView({ id }: { id: string }) {
  const query = useQuery({
    queryKey: storeDetailQueryKey(id),
    queryFn: () => fetchStoreDetail(id),
    meta: { inlineError: true }, // 404, 403 and errors have their own state below
  });

  if (query.isPending) return <StoreSkeleton />;
  if (query.isError) {
    const error = query.error;
    if (isForbidden(error)) return <Forbidden embedded />;
    if (isApiError(error) && (error.statusCode === 404 || error.statusCode === 400)) {
      return (
        <section role="status" className="flex max-w-md flex-col items-start gap-4 rounded-card bg-surface p-6">
          <h2 className="font-display text-[22px] font-bold">Quincaillerie introuvable</h2>
          <p className="text-[15px] text-muted-ink">Cette quincaillerie n’existe pas ou a été supprimée.</p>
          <Link href="/stores" className={buttonVariants({ variant: "secondary" })}>
            Retour à la liste
          </Link>
        </section>
      );
    }
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-card bg-surface p-6">
        <p className="text-[15px] text-danger">{isApiError(error) ? error.message : UNEXPECTED_ERROR_MESSAGE}</p>
        <Button variant="secondary" onClick={() => query.refetch()}>
          Réessayer
        </Button>
      </div>
    );
  }

  const store = query.data;
  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-5">
        <Header store={store} />
        <StoreTabs store={store} />
      </div>
      <LifecycleActions store={store} />
    </div>
  );
}

function Header({ store }: { store: StoreDetail }) {
  const showReason = store.statusReason && (store.status === "SUSPENDED" || store.status === "CLOSED");
  return (
    <section aria-labelledby="store-name" className="flex flex-col gap-3 rounded-card bg-surface p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="store-name" className="font-display text-[26px] leading-tight font-bold">
          {store.name}
        </h2>
        <StatusPill tone={STORE_STATUS_TONES[store.status]}>{STORE_STATUS_LABELS[store.status]}</StatusPill>
      </div>
      {showReason && (
        <p className="text-[15px]">
          <span className="text-muted-ink">Motif : </span>
          {store.statusReason}
        </p>
      )}
      {store.status === "PENDING" && (
        <div className="flex flex-wrap items-center gap-3 rounded-control bg-brand-soft p-4">
          <p className="text-[15px]">Ce dossier attend sa vérification.</p>
          <Link href={`/stores/${store.id}/verification`} className={buttonVariants({ variant: "action" })}>
            Examiner le dossier
          </Link>
        </div>
      )}
    </section>
  );
}

const TAB_TRIGGER =
  "min-h-11 flex-none rounded-full bg-surface px-4 text-[15px] font-semibold text-ink hover:bg-ink/5 data-active:bg-ink data-active:text-surface data-active:shadow-none";

// The four sections as tabs under the header (user revision); the panels are
// labelled by their tab, so they carry no heading of their own.
function StoreTabs({ store }: { store: StoreDetail }) {
  return (
    <Tabs defaultValue="info" className="gap-4">
      <div className="-mx-1 overflow-x-auto px-1">
        <TabsList aria-label="Sections de la fiche" className="h-auto gap-2 bg-transparent p-0">
          <TabsTrigger value="info" className={TAB_TRIGGER}>
            Informations
          </TabsTrigger>
          <TabsTrigger value="managers" className={TAB_TRIGGER}>
            {store.managers.length > 1 ? "Gérants" : "Gérant"}
          </TabsTrigger>
          <TabsTrigger value="settings" className={TAB_TRIGGER}>
            Paramètres
          </TabsTrigger>
          <TabsTrigger value="subscription" className={TAB_TRIGGER}>
            Abonnement
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="info" className="rounded-card bg-surface p-6">
        <Information store={store} />
      </TabsContent>
      <TabsContent value="managers" className="rounded-card bg-surface p-6">
        <Managers store={store} />
      </TabsContent>
      <TabsContent value="settings" className="rounded-card bg-surface p-6">
        <Settings store={store} />
      </TabsContent>
      <TabsContent value="subscription" className="rounded-card bg-surface p-6">
        <Subscription store={store} />
      </TabsContent>
    </Tabs>
  );
}

function Rows({ children }: { children: React.ReactNode }) {
  return <dl className="grid gap-x-6 gap-y-3 text-[15px] sm:grid-cols-[12rem_1fr]">{children}</dl>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-ink">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

function Information({ store }: { store: StoreDetail }) {
  return (
    <>
      <Rows>
        <Row label="Adresse">{store.address}</Row>
        <Row label="Ville">
          {store.city}, {store.country.name}
        </Row>
        <Row label="Téléphone">{store.phone}</Row>
        <Row label="Registre du commerce">{store.tradeRegister}</Row>
        <Row label="Inscription">
          {store.selfRegistered ? "Depuis l’application" : "Par un administrateur"}, le{" "}
          {formatDate(store.createdAt)}
        </Row>
        <Row label="Vérification">{store.verifiedAt ? `Le ${formatDate(store.verifiedAt)}` : "—"}</Row>
      </Rows>
    </>
  );
}

function Managers({ store }: { store: StoreDetail }) {
  return (
    <>
      {store.managers.length === 0 ? (
        <p className="text-[15px] text-muted-ink">Aucun gérant</p>
      ) : (
        <ul className="flex flex-col gap-2 text-[15px]">
          {store.managers.map((manager) => (
            <li key={manager.userId}>
              <span className="font-semibold">
                {manager.firstName} {manager.lastName}
              </span>{" "}
              · {manager.phone}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Settings({ store }: { store: StoreDetail }) {
  const money = { symbol: store.country.currencySymbol, decimals: store.country.decimals };
  const { settings } = store;
  return (
    <>
      <Rows>
        <Row label="Solde maximum">{formatMoney(settings.maxBalance, money)}</Row>
        <Row label="Seuil de validation">{formatMoney(settings.validationThreshold, money)}</Row>
        <Row label="Dépôt minimum">{formatMoney(settings.minDeposit, money)}</Row>
        <Row label="Délai de livraison">
          {settings.deliveryDelayDays} jour{settings.deliveryDelayDays > 1 ? "s" : ""}
        </Row>
        <Row label="Conditions">
          {settings.terms ? <span className="whitespace-pre-line">{settings.terms}</span> : "Aucune"}
        </Row>
      </Rows>
    </>
  );
}

function Subscription({ store }: { store: StoreDetail }) {
  const current = store.currentSubscription;
  return (
    <>
      <Rows>
        <Row label="État">
          <StatusPill tone={SUBSCRIPTION_STATE_TONES[store.subscriptionState]}>
            {SUBSCRIPTION_STATE_LABELS[store.subscriptionState]}
          </StatusPill>
        </Row>
        {current ? (
          <>
            <Row label="Formule">{PLAN_LABELS[current.plan]}</Row>
            <Row label="Période">
              du {formatDate(current.startsOn)} au {formatDate(current.endsOn)}
            </Row>
          </>
        ) : (
          <Row label="Formule">Aucun abonnement</Row>
        )}
        {store.requestedPlan && (
          <Row label="Formule demandée">{PLAN_LABELS[store.requestedPlan]}</Row>
        )}
      </Rows>
    </>
  );
}

export function StoreSkeleton() {
  return (
    <div role="status" aria-label="Chargement de la quincaillerie" className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex flex-col gap-5">
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-64 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
      </div>
      <Skeleton className="h-56 rounded-card" />
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Forbidden } from "@/components/forbidden";
import { StatusPill, STORE_STATUS_TONES } from "@/components/status-pill";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError, isForbidden, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import {
  fetchStoreDetail,
  PLAN_LABELS,
  STORE_DOCUMENT_KINDS,
  STORE_STATUS_LABELS,
  storeDetailQueryKey,
  type StoreDetail,
} from "@/lib/api/stores";
import { formatDate } from "@/lib/format";
import { DocumentPanel } from "./document-panel";
import { VerifyPanel } from "./verify-panel";

export function VerificationView({ id }: { id: string }) {
  const query = useQuery({
    queryKey: storeDetailQueryKey(id),
    queryFn: () => fetchStoreDetail(id),
    meta: { inlineError: true }, // 404, 403 and errors have their own state below
  });

  if (query.isPending) return <VerificationSkeleton />;
  if (query.isError) {
    const error = query.error;
    if (isForbidden(error)) return <Forbidden embedded />;
    // 400: not a valid store id; 404: no such store.
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
        <StoreFile store={store} />
        <section aria-labelledby="documents-title" className="flex flex-col gap-3">
          <h2 id="documents-title" className="font-display text-[22px] font-bold">
            Documents
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {STORE_DOCUMENT_KINDS.map((doc) => (
              <DocumentPanel
                key={doc.kind}
                storeId={store.id}
                storeName={store.name}
                kind={doc.kind}
                label={doc.label}
                sent={store.documents[doc.field]}
              />
            ))}
          </div>
        </section>
      </div>
      <VerifyPanel store={store} />
    </div>
  );
}

function StoreFile({ store }: { store: StoreDetail }) {
  return (
    <section aria-labelledby="store-title" className="rounded-card bg-surface p-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h2 id="store-title" className="font-display text-[22px] font-bold">
          {store.name}
        </h2>
        <StatusPill tone={STORE_STATUS_TONES[store.status]}>{STORE_STATUS_LABELS[store.status]}</StatusPill>
      </div>
      <dl className="grid gap-x-6 gap-y-3 text-[15px] sm:grid-cols-[11rem_1fr]">
        <Row label="Adresse">{store.address}</Row>
        <Row label="Ville">
          {store.city}, {store.country.name}
        </Row>
        <Row label="Téléphone">{store.phone}</Row>
        <Row label="Registre du commerce">{store.tradeRegister}</Row>
        <Row label={store.managers.length > 1 ? "Gérants" : "Gérant"}>
          {store.managers.length === 0 ? (
            <span className="text-muted-ink">Aucun gérant</span>
          ) : (
            <ul className="flex flex-col gap-1">
              {store.managers.map((manager) => (
                <li key={manager.userId}>
                  {manager.firstName} {manager.lastName} · {manager.phone}
                </li>
              ))}
            </ul>
          )}
        </Row>
        <Row label="Formule demandée">{store.requestedPlan ? PLAN_LABELS[store.requestedPlan] : "—"}</Row>
        <Row label="Inscription">
          {store.selfRegistered ? "Depuis l’application" : "Par un administrateur"}, le{" "}
          {formatDate(store.createdAt)}
        </Row>
      </dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-ink">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

export function VerificationSkeleton() {
  return (
    <div role="status" aria-label="Chargement du dossier" className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex flex-col gap-5">
        <Skeleton className="h-72 rounded-card" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
        </div>
      </div>
      <Skeleton className="h-80 rounded-card" />
    </div>
  );
}

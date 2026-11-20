"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Forbidden } from "@/components/forbidden";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { countriesQueryKey, fetchCountries, LANGUAGE_LABELS, type Country } from "@/lib/api/countries";
import { isApiError, isForbidden, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import { can } from "@/lib/auth/permissions";
import { useCurrentAdmin } from "@/lib/auth/use-current-admin";
import { CountryFormDialog } from "./country-form-dialog";
import { CountryStatusDialog } from "./country-status-dialog";

export const COUNTRIES_HEADING_ID = "countries-list";

const COLUMNS = ["Code", "Nom", "Indicatif", "Devise", "Décimales", "Langue", "État"];

type Opened = { kind: "form"; country: Country | null } | { kind: "status"; country: Country } | null;

export function CountriesView() {
  const query = useQuery({
    queryKey: countriesQueryKey,
    queryFn: fetchCountries,
    meta: { inlineError: true },
  });
  const admin = useCurrentAdmin().data;
  const canManage = !!admin && can(admin, "countries.manage");
  const [opened, setOpened] = useState<Opened>(null);

  if (query.isError) {
    if (isForbidden(query.error)) return <Forbidden embedded />;
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-card bg-surface p-6">
        <p className="text-[15px] text-danger">
          {isApiError(query.error) ? query.error.message : UNEXPECTED_ERROR_MESSAGE}
        </p>
        <Button variant="secondary" onClick={() => query.refetch()}>
          Réessayer
        </Button>
      </div>
    );
  }

  const countries = query.data;
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-[15px] text-muted-ink">
          Un seul pays actif à la fois. La devise d’un pays qui a des quincailleries ne peut plus changer.
        </p>
        {canManage && (
          <Button variant="action" onClick={() => setOpened({ kind: "form", country: null })}>
            Ajouter un pays
          </Button>
        )}
      </div>

      <section
        aria-labelledby={COUNTRIES_HEADING_ID}
        aria-busy={query.isFetching || undefined}
        className="flex min-w-0 flex-col gap-4 rounded-card bg-surface p-2 md:p-4"
      >
        {/* Focus lands here after a change replaces the clicked button. */}
        <h2 id={COUNTRIES_HEADING_ID} tabIndex={-1} className="sr-only">
          Liste des pays
        </h2>
        {!countries ? (
          <TableRowsSkeleton />
        ) : countries.length === 0 ? (
          <p role="status" className="px-4 py-12 text-center text-[15px] text-muted-ink">
            Aucun pays pour le moment.
          </p>
        ) : (
          <Table className="min-w-[52rem] text-[15px]">
            <TableHeader>
              <TableRow>
                {COLUMNS.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {countries.map((country) => (
                <TableRow key={country.code}>
                  <TableCell className="py-3 font-semibold">{country.code}</TableCell>
                  <TableCell>{country.name}</TableCell>
                  <TableCell>{country.phonePrefix}</TableCell>
                  <TableCell>
                    {country.currencyCode} <span className="text-muted-ink">({country.currencySymbol})</span>
                  </TableCell>
                  <TableCell>{country.decimals}</TableCell>
                  <TableCell>{LANGUAGE_LABELS[country.language]}</TableCell>
                  <TableCell>
                    {country.active ? (
                      <StatusPill tone="success">Actif</StatusPill>
                    ) : (
                      <StatusPill tone="muted">Inactif</StatusPill>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => setOpened({ kind: "form", country })}
                          aria-label={`Modifier ${country.name}`}
                        >
                          Modifier
                        </Button>
                        <Button
                          variant={country.active ? "secondary" : "action"}
                          onClick={() => setOpened({ kind: "status", country })}
                          aria-label={`${country.active ? "Désactiver" : "Activer"} ${country.name}`}
                        >
                          {country.active ? "Désactiver" : "Activer"}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {opened?.kind === "form" && (
        <CountryFormDialog
          key={opened.country?.code ?? "new"}
          country={opened.country}
          onClose={() => setOpened(null)}
        />
      )}
      {opened?.kind === "status" && (
        <CountryStatusDialog key={opened.country.code} country={opened.country} onClose={() => setOpened(null)} />
      )}
    </div>
  );
}

function TableRowsSkeleton() {
  return (
    <div role="status" aria-label="Chargement des pays" className="flex flex-col gap-2 p-2">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-14 rounded-control" />
      ))}
    </div>
  );
}

export function CountriesSkeleton() {
  return (
    <div role="status" aria-label="Chargement des pays" className="flex flex-col gap-5">
      <Skeleton className="h-11 w-full max-w-xl rounded-control" />
      <Skeleton className="h-64 rounded-card" />
    </div>
  );
}

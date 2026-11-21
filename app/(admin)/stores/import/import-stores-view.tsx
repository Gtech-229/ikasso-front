"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isApiError, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import {
  fetchImportTemplate,
  IMPORT_TEMPLATE_FILE_NAME,
  importStores,
  type ImportFormat,
  type StoreImportResult,
  type StoreImportRow,
} from "@/lib/api/store-import";
import { invalidateStoreLists } from "@/lib/api/stores-queries";

const errorMessage = (error: unknown) => (isApiError(error) ? error.message : UNEXPECTED_ERROR_MESSAGE);
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Saves a blob under `name` through a temporary link, then frees its URL. */
function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  // Freed on the next task: some browsers start the download after click returns.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function ImportStoresView() {
  const queryClient = useQueryClient();
  const fileId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<StoreImportResult | null>(null);
  const [report, setReport] = useState<StoreImportResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const template = useMutation({
    mutationFn: (format: ImportFormat) => fetchImportTemplate(format),
    onSuccess: (blob, format) => saveBlob(blob, `${IMPORT_TEMPLATE_FILE_NAME}.${format}`),
  });

  const check = useMutation({
    mutationFn: (chosen: File) => importStores(chosen, true),
    onSuccess: (result) => setPreview(result),
    onError: (error) => setFileError(errorMessage(error)),
  });

  const run = useMutation({
    mutationFn: (chosen: File) => importStores(chosen, false),
    onSuccess: (result) => {
      setReport(result);
      setPreview(null);
      if (result.created > 0) invalidateStoreLists(queryClient);
    },
    onError: (error) => setFileError(errorMessage(error)),
  });

  const busy = check.isPending || run.isPending;
  const validCount = preview ? preview.total - preview.rejected : 0;

  function chooseFile(next: File | null) {
    setFile(next);
    setPreview(null);
    setReport(null);
    setFileError(null);
  }

  function startOver() {
    if (inputRef.current) inputRef.current.value = "";
    chooseFile(null);
  }

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <section aria-labelledby="import-template" className="flex flex-col gap-3 rounded-card bg-surface p-6">
        <h2 id="import-template" className="font-display text-xl font-bold">
          1. Le modèle
        </h2>
        <p className="text-[15px] text-muted-ink">
          Une ligne par quincaillerie, avec son gérant. Le CSV est en UTF-8, séparé par des points-virgules.
          Les colonnes <code>settings.terms</code> et <code>settings.deliveryDelayDays</code> sont facultatives.
        </p>
        <div className="flex flex-wrap gap-3">
          {(["csv", "xlsx"] as const).map((format) => (
            <Button
              key={format}
              variant="secondary"
              disabled={template.isPending}
              onClick={() => template.mutate(format)}
            >
              {format === "csv" ? "Modèle CSV" : "Modèle Excel"}
            </Button>
          ))}
        </div>
        {template.isError && (
          <p role="alert" className="text-[15px] text-danger">
            {errorMessage(template.error)}
          </p>
        )}
      </section>

      <section aria-labelledby="import-file" className="flex flex-col gap-4 rounded-card bg-surface p-6">
        <h2 id="import-file" className="font-display text-xl font-bold">
          2. Le fichier
        </h2>
        <Field>
          <FieldLabel htmlFor={fileId}>Fichier à importer</FieldLabel>
          <Input
            ref={inputRef}
            id={fileId}
            type="file"
            accept=".csv,.xlsx"
            disabled={busy}
            aria-invalid={fileError ? true : undefined}
            aria-describedby={fileError ? `${fileId}-hint ${errorId}` : `${fileId}-hint`}
            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          />
          <FieldDescription id={`${fileId}-hint`}>
            Fichier .csv ou .xlsx (première feuille), 2 Mo et 500 lignes au plus.
          </FieldDescription>
          {fileError && (
            <p id={errorId} role="alert" className="text-[15px] text-danger">
              {fileError}
            </p>
          )}
        </Field>
        {!report && (
          <div>
            <Button
              variant="action"
              disabled={!file || busy}
              onClick={() => {
                if (!file) return;
                setFileError(null);
                check.mutate(file);
              }}
            >
              {check.isPending ? "Vérification…" : "Vérifier le fichier"}
            </Button>
          </div>
        )}
      </section>

      {preview && file && (
        <section aria-labelledby="import-preview" className="flex flex-col gap-4 rounded-card bg-surface p-6">
          <h2 id="import-preview" className="font-display text-xl font-bold">
            3. Vérification
          </h2>
          <p role="status" className="text-[15px]">
            {plural(preview.total, "ligne lue", "lignes lues")} : {plural(validCount, "valide", "valides")},{" "}
            {plural(preview.rejected, "en erreur", "en erreur")}.
          </p>
          {preview.rejected === 0 ? (
            <p className="text-[15px] text-muted-ink">Toutes les lignes sont valides.</p>
          ) : (
            <RowErrorsTable rows={preview.rows.filter((row) => row.errors.length > 0)} />
          )}
          <p className="text-[15px] text-muted-ink">
            L’import vérifie de nouveau chaque ligne : le résultat peut différer si les données ont changé
            entre-temps.
          </p>
          <div>
            <Button
              variant="action"
              disabled={validCount === 0 || busy}
              onClick={() => {
                setFileError(null);
                run.mutate(file);
              }}
            >
              {run.isPending
                ? "Import en cours…"
                : `Importer ${plural(validCount, "quincaillerie", "quincailleries")}`}
            </Button>
          </div>
        </section>
      )}

      {report && <ImportReport report={report} onStartOver={startOver} />}
    </div>
  );
}

function ImportReport({ report, onStartOver }: { report: StoreImportResult; onStartOver: () => void }) {
  const created = report.rows.filter((row) => row.status === "created");
  const refused = report.rows.filter((row) => row.status !== "created");
  return (
    <section aria-labelledby="import-report" className="flex flex-col gap-4 rounded-card bg-surface p-6">
      <h2 id="import-report" className="font-display text-xl font-bold">
        3. Résultat
      </h2>
      <p role="status" className="text-[15px]">
        {plural(report.created, "quincaillerie créée", "quincailleries créées")},{" "}
        {plural(report.rejected, "ligne non créée", "lignes non créées")}.
      </p>
      {created.length > 0 && (
        <>
          <p className="text-[15px] text-muted-ink">
            Les quincailleries créées sont en attente : vérifiez leur dossier avant de les valider.
          </p>
          <ul className="flex flex-col gap-1 text-[15px]">
            {created.map((row) => (
              <li key={row.row}>
                Ligne {row.row} :{" "}
                {row.storeId ? (
                  <Link href={`/stores/${encodeURIComponent(row.storeId)}`} className="font-semibold underline">
                    ouvrir la quincaillerie
                  </Link>
                ) : (
                  "créée"
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {refused.length > 0 && <RowErrorsTable rows={refused} />}
      <div className="flex flex-wrap gap-3">
        <Button variant="action" onClick={onStartOver}>
          Importer un autre fichier
        </Button>
        <Link href="/stores" className={buttonVariants({ variant: "secondary" })}>
          Retour aux quincailleries
        </Link>
      </div>
    </section>
  );
}

function RowErrorsTable({ rows }: { rows: StoreImportRow[] }) {
  return (
    <div className="overflow-x-auto">
      <Table className="text-[15px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Ligne</TableHead>
            <TableHead>Erreurs</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.row}>
              <TableCell className="align-top font-semibold">{row.row}</TableCell>
              <TableCell className="whitespace-normal">
                <ul className="flex flex-col gap-1">
                  {row.errors.map((error, index) => (
                    <li key={index}>
                      {error.field ? (
                        <>
                          <code>{error.field}</code> : {error.message}
                        </>
                      ) : (
                        error.message
                      )}
                    </li>
                  ))}
                </ul>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

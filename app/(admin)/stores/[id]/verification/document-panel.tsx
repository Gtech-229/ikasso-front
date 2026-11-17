"use client";

import { useQuery } from "@tanstack/react-query";
import { FileX, ZoomIn } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import { fetchStoreDocument, storeDocumentQueryKey, type StoreDocumentKind } from "@/lib/api/stores";
import { cn } from "@/lib/utils";

const ZOOM_LEVELS = [1, 2, 3] as const;

/**
 * An object URL for an in-memory image, released when the blob changes or the
 * panel unmounts. Personal data: nothing is written to storage.
 */
function useObjectUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) return;
    const next = URL.createObjectURL(blob);
    // Syncing with an external resource (the browser's object URL), created and
    // released here so Strict Mode's remount never leaves a revoked URL.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(next);
    return () => {
      URL.revokeObjectURL(next);
      setUrl(undefined);
    };
  }, [blob]);
  return url;
}

export function DocumentPanel({
  storeId,
  storeName,
  kind,
  label,
  sent,
}: {
  storeId: string;
  storeName: string;
  kind: StoreDocumentKind;
  label: string;
  sent: boolean;
}) {
  const query = useQuery({
    queryKey: storeDocumentQueryKey(storeId, kind),
    queryFn: () => fetchStoreDocument(storeId, kind),
    enabled: sent,
    // The photo does not change during the visit; dropped as soon as no one shows it.
    staleTime: Infinity,
    gcTime: 0,
    meta: { inlineError: true }, // "Document non envoyé" or the panel's retry
  });
  const url = useObjectUrl(query.data);
  const [open, setOpen] = useState(false);
  const missing = !sent || (isApiError(query.error) && query.error.statusCode === 404);
  const alt = `${label} de ${storeName}`;

  return (
    <section aria-label={label} className="flex flex-col gap-3 rounded-card bg-surface p-4">
      <h3 className="text-[15px] font-semibold">{label}</h3>
      {missing ? (
        <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-control bg-canvas text-muted-ink">
          <FileX aria-hidden="true" className="size-6" />
          <p className="text-[15px]">Document non envoyé</p>
        </div>
      ) : query.isError ? (
        <div role="alert" className="flex h-56 flex-col items-center justify-center gap-3 rounded-control bg-canvas p-4 text-center">
          <p className="text-[15px] text-danger">
            {isApiError(query.error) ? query.error.message : UNEXPECTED_ERROR_MESSAGE}
          </p>
          <Button variant="secondary" onClick={() => query.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : !url ? (
        <Skeleton role="status" aria-label={`Chargement : ${label}`} className="h-56 rounded-control" />
      ) : (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Agrandir : ${label}`}
            className="group relative overflow-hidden rounded-control bg-canvas focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {/* Blob URL of a private photo: next/image cannot optimise or cache it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={alt} className="h-56 w-full object-contain" />
            <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-ink/80 px-3 py-1 text-[13px] text-surface">
              <ZoomIn aria-hidden="true" className="size-4" />
              Agrandir
            </span>
          </button>
          <ZoomDialog open={open} onOpenChange={setOpen} url={url} label={label} alt={alt} />
        </>
      )}
    </section>
  );
}

function ZoomDialog({
  open,
  onOpenChange,
  url,
  label,
  alt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  label: string;
  alt: string;
}) {
  const [zoom, setZoom] = useState<(typeof ZOOM_LEVELS)[number]>(1);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setZoom(1);
      }}
    >
      <DialogContent className="flex max-h-[92vh] flex-col gap-3 sm:max-w-5xl">
        <DialogTitle className="font-display text-[18px] font-bold">{label}</DialogTitle>
        <DialogDescription className="sr-only">
          Photo du document, agrandissable. Faites défiler pour vous déplacer.
        </DialogDescription>
        <div role="group" aria-label="Zoom" className="flex gap-2">
          {ZOOM_LEVELS.map((level) => (
            <Button
              key={level}
              variant={zoom === level ? "default" : "secondary"}
              aria-pressed={zoom === level}
              onClick={() => setZoom(level)}
            >
              {level * 100} %
            </Button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded-control bg-canvas">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={alt}
            style={{ width: `${zoom * 100}%` }}
            className={cn("block h-auto max-w-none", zoom === 1 && "mx-auto")}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

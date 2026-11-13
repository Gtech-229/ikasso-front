"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { healthQueryKey, healthSchema } from "@/lib/api/health";
import { formatDateTime } from "@/lib/format";

export function ApiStatus() {
  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: healthQueryKey,
    queryFn: ({ signal }) => apiFetch("/health", { schema: healthSchema, signal }),
  });

  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground" aria-live="polite">
      <span
        aria-hidden
        className={`size-2.5 rounded-full ${
          isPending ? "bg-brand-soft" : isError ? "bg-danger" : "bg-success"
        }`}
      />
      <span>
        {isPending
          ? "API : vérification…"
          : isError
            ? "API : injoignable"
            : `API : disponible (${formatDateTime(data.timestamp)})`}
      </span>
      <button
        type="button"
        onClick={() => refetch()}
        disabled={isFetching}
        className="font-semibold text-ink underline underline-offset-4 disabled:opacity-50"
      >
        Vérifier
      </button>
    </div>
  );
}

"use client";

import type { QueryClient } from "@tanstack/react-query";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { isApiError, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import { storeDetailQueryKey } from "@/lib/api/stores";

/**
 * Puts each API `details` entry on its form field. Returns the message for the
 * inline alert when nothing landed on a field, else null.
 */
export function showSaveError<T extends FieldValues>(
  error: unknown,
  form: UseFormReturn<T>,
  fields: readonly Path<T>[],
): string | null {
  if (!isApiError(error)) return UNEXPECTED_ERROR_MESSAGE;
  let placed = false;
  for (const detail of error.details) {
    const field = fields.find((name) => name === detail.field);
    if (field && detail.errors[0]) {
      form.setError(field, { message: detail.errors[0] });
      placed = true;
    }
  }
  return placed ? null : error.message;
}

/**
 * The store was closed meanwhile (409 STORE_CLOSED): tell the admin, leave edit
 * mode and reload, so the page shows the closed store without edit buttons.
 */
export function handleStoreClosed(
  error: unknown,
  queryClient: QueryClient,
  storeId: string,
  leave: () => void,
  focusAfterReload: () => void,
): boolean {
  if (!isApiError(error) || error.error !== "STORE_CLOSED") return false;
  toast.error(error.message);
  leave();
  // "Modifier" disappears with the reload: focus the panel itself once it is done.
  void queryClient.invalidateQueries({ queryKey: storeDetailQueryKey(storeId) }).then(focusAfterReload);
  return true;
}

export function SaveAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-control bg-danger/10 px-4 py-3 text-[15px] text-danger">
      {message}
    </p>
  );
}

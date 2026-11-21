"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { isApiError, UNEXPECTED_ERROR_MESSAGE } from "@/lib/api/errors";
import { apiFieldMessage } from "@/lib/api/field-errors";
import {
  bulkStoreAction,
  storeDetailQueryKey,
  type BulkStatusResult,
  type BulkStoreAction,
  type StoreSummary,
} from "@/lib/api/stores";
import { invalidateStoreLists } from "@/lib/api/stores-queries";
import {
  bulkActionsFor,
  REASON_MAX,
  reasonSchema,
  STORE_ACTION_CONSEQUENCES,
} from "@/lib/store-lifecycle";

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
const REASON_ID = "bulk-reason";

const BULK: Record<
  BulkStoreAction,
  {
    button: string;
    variant: "secondary" | "action" | "destructive";
    verb: string;
    text: string;
    confirm: string;
    pending: string;
    needsReason: boolean;
  }
> = {
  verify: {
    button: "Valider",
    variant: "action",
    verb: "Valider",
    // The single action's text (verify-panel.tsx), in the plural.
    text: "Les quincailleries passeront au statut Vérifiée.",
    confirm: "Valider",
    pending: "Validation…",
    needsReason: false,
  },
  suspend: {
    button: "Suspendre",
    variant: "secondary",
    verb: "Suspendre",
    text: STORE_ACTION_CONSEQUENCES.suspend,
    confirm: "Suspendre",
    pending: "Suspension…",
    needsReason: true,
  },
  reactivate: {
    button: "Réactiver",
    variant: "action",
    verb: "Réactiver",
    text: STORE_ACTION_CONSEQUENCES.reactivate,
    confirm: "Réactiver",
    pending: "Réactivation…",
    needsReason: false,
  },
  close: {
    button: "Fermer",
    variant: "destructive",
    verb: "Fermer",
    text: STORE_ACTION_CONSEQUENCES.close,
    confirm: "Fermer définitivement",
    pending: "Fermeture…",
    needsReason: true,
  },
};

/** The bar above the table while stores are selected (feature 21). */
export function BulkActionBar({
  selected,
  onClear,
  onDone,
}: {
  selected: StoreSummary[];
  onClear: () => void;
  /** After the API answered: clear the selection and give focus a home. */
  onDone: () => void;
}) {
  // The stores are captured when the dialog opens: the list refetches after the
  // action, and stores that changed status may leave the selection (closed, or
  // another tab) while the result is still on screen.
  const [open, setOpen] = useState<{ action: BulkStoreAction; stores: StoreSummary[] } | null>(null);
  const { actions, incomplete } = bulkActionsFor(selected);
  const allPending = selected.every((store) => store.status === "PENDING");

  let hint: string | null = null;
  if (allPending && incomplete > 0) {
    hint = `${plural(incomplete, "dossier incomplet", "dossiers incomplets")} : examinez-les un par un.`;
  } else if (actions.length === 0) {
    hint = "Aucune action commune à cette sélection.";
  }

  const dialog = open && (
    <BulkDialog
      key={open.action}
      action={open.action}
      stores={open.stores}
      onClose={(answered) => {
        setOpen(null);
        if (answered) onDone();
      }}
    />
  );
  // The dialog keeps the same place in the tree whether or not the bar shows,
  // so React never remounts it (and loses the result) when the selection empties.
  return (
    <>
      {selected.length > 0 && (
        <div
          role="region"
          aria-label="Actions groupées"
          className="flex flex-wrap items-center gap-3 rounded-control bg-muted px-4 py-3"
        >
          <p aria-live="polite" className="text-[15px] font-semibold">
            {plural(selected.length, "sélectionnée", "sélectionnées")}
          </p>
          <Button variant="ghost" onClick={onClear}>
            Tout désélectionner
          </Button>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            {actions.map((action) => (
              <Button key={action} variant={BULK[action].variant} onClick={() => setOpen({ action, stores: selected })}>
                {BULK[action].button}
              </Button>
            ))}
          </div>
          {hint && <p className="w-full text-[14px] text-muted-ink">{hint}</p>}
        </div>
      )}
      {dialog}
    </>
  );
}

function BulkDialog({
  action,
  stores,
  onClose,
}: {
  action: BulkStoreAction;
  stores: StoreSummary[];
  onClose: (answered: boolean) => void;
}) {
  const config = BULK[action];
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string>();
  const [result, setResult] = useState<BulkStatusResult | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      bulkStoreAction(
        action,
        stores.map((store) => store.id),
        config.needsReason ? reason.trim() : undefined,
      ),
    onSuccess: (answer) => {
      setResult(answer);
      invalidateStoreLists(queryClient);
      for (const item of answer.results) {
        if (item.ok) void queryClient.invalidateQueries({ queryKey: storeDetailQueryKey(item.id) });
      }
    },
  });

  const error = mutation.error;
  const fieldError = reasonError ?? apiFieldMessage(error, "reason");
  const generalError =
    mutation.isError && !fieldError ? (isApiError(error) ? error.message : UNEXPECTED_ERROR_MESSAGE) : null;

  // Button, Escape or outside press; never mid-request.
  function close() {
    if (mutation.isPending) return;
    onClose(result !== null);
  }

  function submit() {
    if (config.needsReason) {
      const parsed = reasonSchema.safeParse(reason);
      if (!parsed.success) {
        setReasonError(parsed.error.issues[0]?.message);
        document.getElementById(REASON_ID)?.focus();
        return;
      }
    }
    setReasonError(undefined);
    mutation.reset();
    mutation.mutate();
  }

  const title = `${config.verb} ${plural(stores.length, "quincaillerie", "quincailleries")} ?`;

  if (result) {
    const nameOf = new Map(stores.map((store) => [store.id, store.name]));
    const refused = result.results.filter((item) => !item.ok);
    const succeeded = result.results.length - refused.length;
    return (
      <AlertDialog open onOpenChange={(next) => !next && close()}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Résultat</AlertDialogTitle>
            <AlertDialogDescription role="status">
              {plural(succeeded, "réussie", "réussies")}, {plural(refused.length, "refusée", "refusées")}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {refused.length > 0 && (
            <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto text-[15px]">
              {refused.map((item) => (
                <li key={item.id}>
                  <span className="font-semibold">{nameOf.get(item.id) ?? item.id}</span> :{" "}
                  {item.error?.message ?? UNEXPECTED_ERROR_MESSAGE}
                </li>
              ))}
            </ul>
          )}
          <AlertDialogFooter>
            <Button variant="secondary" onClick={close}>
              Fermer
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open onOpenChange={(next) => !next && close()}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{config.text}</AlertDialogDescription>
        </AlertDialogHeader>

        <ul aria-label="Quincailleries concernées" className="flex max-h-40 flex-col gap-1 overflow-y-auto text-[15px]">
          {stores.map((store) => (
            <li key={store.id}>{store.name}</li>
          ))}
        </ul>

        {config.needsReason && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={REASON_ID} className="text-[15px] font-semibold">
              Motif
            </label>
            <Textarea
              id={REASON_ID}
              value={reason}
              maxLength={REASON_MAX}
              rows={3}
              disabled={mutation.isPending}
              onChange={(event) => {
                setReason(event.target.value);
                if (reasonError) setReasonError(undefined);
              }}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? `${REASON_ID}-count ${REASON_ID}-error` : `${REASON_ID}-count`}
              className="text-[15px]"
            />
            <p id={`${REASON_ID}-count`} className="text-right text-[13px] text-muted-ink">
              {reason.trim().length} / {REASON_MAX}
            </p>
            {fieldError && (
              <p id={`${REASON_ID}-error`} role="alert" className="text-[14px] text-danger">
                {fieldError}
              </p>
            )}
          </div>
        )}

        {generalError && (
          <p role="alert" className="rounded-control bg-danger/10 px-4 py-3 text-[15px] text-danger">
            {generalError}
          </p>
        )}

        <AlertDialogFooter>
          <Button variant="secondary" disabled={mutation.isPending} onClick={close}>
            Annuler
          </Button>
          <Button variant={config.variant} disabled={mutation.isPending} onClick={submit}>
            {mutation.isPending ? config.pending : config.confirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

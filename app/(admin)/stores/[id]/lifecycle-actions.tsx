"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
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
  closeStore,
  reactivateStore,
  storeDetailQueryKey,
  suspendStore,
  type StoreDetail,
} from "@/lib/api/stores";
import { invalidateStoreLists } from "@/lib/api/stores-queries";
import { can } from "@/lib/auth/permissions";
import { useCurrentAdmin } from "@/lib/auth/use-current-admin";
import {
  REASON_MAX,
  reasonSchema,
  STORE_ACTION_CONSEQUENCES,
  STORE_ACTIONS,
  type StoreAction,
} from "@/lib/store-lifecycle";

const HEADING_ID = "actions-title";

const ACTIONS: Record<
  StoreAction,
  {
    button: string;
    variant: "secondary" | "action" | "destructive";
    title: (name: string) => string;
    text: string;
    confirm: string;
    pending: string;
    done: string;
    needsReason: boolean;
  }
> = {
  suspend: {
    button: "Suspendre",
    variant: "secondary",
    title: (name) => `Suspendre ${name} ?`,
    text: STORE_ACTION_CONSEQUENCES.suspend,
    confirm: "Suspendre",
    pending: "Suspension…",
    done: "Quincaillerie suspendue.",
    needsReason: true,
  },
  reactivate: {
    button: "Réactiver",
    variant: "action",
    title: (name) => `Réactiver ${name} ?`,
    text: STORE_ACTION_CONSEQUENCES.reactivate,
    confirm: "Réactiver",
    pending: "Réactivation…",
    done: "Quincaillerie réactivée.",
    needsReason: false,
  },
  close: {
    button: "Fermer",
    variant: "destructive",
    title: (name) => `Fermer ${name} ?`,
    text: STORE_ACTION_CONSEQUENCES.close,
    confirm: "Fermer définitivement",
    pending: "Fermeture…",
    done: "Quincaillerie fermée.",
    needsReason: true,
  },
};

function run(action: StoreAction, id: string, reason: string): Promise<StoreDetail> {
  if (action === "suspend") return suspendStore(id, reason);
  if (action === "close") return closeStore(id, reason);
  return reactivateStore(id);
}

export function LifecycleActions({ store }: { store: StoreDetail }) {
  const admin = useCurrentAdmin().data;
  const [open, setOpen] = useState<StoreAction | null>(null);
  if (!admin || !can(admin, "stores.manage")) return null;

  const actions = STORE_ACTIONS[store.status];
  return (
    <aside aria-labelledby={HEADING_ID} className="flex h-fit flex-col gap-4 rounded-card bg-surface p-6">
      <h2 id={HEADING_ID} tabIndex={-1} className="font-display text-[22px] font-bold outline-none">
        Actions
      </h2>
      {actions.length === 0 ? (
        // The API gives no closing date, so none is shown.
        <p className="text-[15px] text-muted-ink">Fermée définitivement.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {actions.map((action) => (
            <Button
              key={action}
              variant={ACTIONS[action].variant}
              className="w-full"
              onClick={() => setOpen(action)}
            >
              {ACTIONS[action].button}
            </Button>
          ))}
        </div>
      )}
      {open && (
        // Remounted per opening: a fresh reason and no error from a previous attempt.
        <LifecycleDialog key={open} action={open} store={store} onClose={() => setOpen(null)} />
      )}
    </aside>
  );
}

function focusActions() {
  document.getElementById(HEADING_ID)?.focus();
}

function LifecycleDialog({
  action,
  store,
  onClose,
}: {
  action: StoreAction;
  store: StoreDetail;
  onClose: () => void;
}) {
  const config = ACTIONS[action];
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string>();

  const mutation = useMutation({
    mutationFn: () => run(action, store.id, reason.trim()),
    onSuccess: (updated) => {
      queryClient.setQueryData(storeDetailQueryKey(store.id), updated);
      invalidateStoreLists(queryClient);
      toast.success(config.done);
      onClose();
      // The clicked button may be gone with the new status: give focus a home.
      requestAnimationFrame(focusActions);
    },
  });

  const error = mutation.error;
  // Someone else changed the status: keep the message until the admin closes.
  const statusChanged = isApiError(error) && error.error === "INVALID_STATUS_TRANSITION";
  const fieldError = reasonError ?? apiFieldMessage(error, "reason");
  const generalError = mutation.isError && !fieldError
    ? isApiError(error) ? error.message : UNEXPECTED_ERROR_MESSAGE
    : null;

  // The one way to close (button, Escape, outside press); never mid-request.
  function close() {
    if (mutation.isPending) return;
    onClose();
    if (statusChanged) {
      void queryClient
        .invalidateQueries({ queryKey: storeDetailQueryKey(store.id) })
        .then(focusActions);
    }
  }

  function submit() {
    if (config.needsReason) {
      const parsed = reasonSchema.safeParse(reason);
      if (!parsed.success) {
        setReasonError(parsed.error.issues[0]?.message);
        document.getElementById("lifecycle-reason")?.focus();
        return;
      }
    }
    setReasonError(undefined);
    mutation.reset();
    mutation.mutate();
  }

  return (
    <AlertDialog open onOpenChange={(next) => !next && close()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{config.title(store.name)}</AlertDialogTitle>
          <AlertDialogDescription>{config.text}</AlertDialogDescription>
        </AlertDialogHeader>

        {config.needsReason && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lifecycle-reason" className="text-[15px] font-semibold">
              Motif
            </label>
            <Textarea
              id="lifecycle-reason"
              value={reason}
              maxLength={REASON_MAX}
              rows={3}
              disabled={mutation.isPending || statusChanged}
              onChange={(event) => {
                setReason(event.target.value);
                if (reasonError) setReasonError(undefined);
              }}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? "lifecycle-reason-count lifecycle-reason-error" : "lifecycle-reason-count"}
              className="text-[15px]"
            />
            <p id="lifecycle-reason-count" className="text-right text-[13px] text-muted-ink">
              {reason.trim().length} / {REASON_MAX}
            </p>
            {fieldError && (
              <p id="lifecycle-reason-error" role="alert" className="text-[14px] text-danger">
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
            {statusChanged ? "Fermer la fenêtre" : "Annuler"}
          </Button>
          <Button
            variant={config.variant}
            // Retrying cannot succeed once the status changed elsewhere.
            disabled={mutation.isPending || statusChanged}
            onClick={submit}
          >
            {mutation.isPending ? config.pending : config.confirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

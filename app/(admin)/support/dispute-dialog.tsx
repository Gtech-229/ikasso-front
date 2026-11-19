"use client";

import { StatusPill, type PillTone } from "@/components/status-pill";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DISPUTE_STATUS_LABELS, OPERATION_TYPE_LABELS, type Dispute, type DisputeStatus } from "@/lib/api/disputes";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Yellow: the store must answer. Black: the customer must. */
export const DISPUTE_STATUS_TONES: Record<DisputeStatus, PillTone> = {
  OPEN: "pending",
  ANSWERED: "dark",
};

/** The thread, read-only: the answer belongs to the store. */
export function DisputeDialog({
  dispute,
  amount,
  onClose,
}: {
  dispute: Dispute;
  amount: (operation: Dispute["operation"]) => string;
  onClose: () => void;
}) {
  const { operation, customer } = dispute;
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-[22px] font-bold">
            Contestation · {dispute.store.name}
          </DialogTitle>
          <DialogDescription className="text-[14px]">
            Lecture seule : la réponse appartient à la quincaillerie.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid gap-x-4 gap-y-2 rounded-control bg-canvas px-4 py-3 text-[15px] sm:grid-cols-[auto_1fr]">
          <dt className="text-muted-ink">État</dt>
          <dd>
            <StatusPill tone={DISPUTE_STATUS_TONES[dispute.status]}>
              {DISPUTE_STATUS_LABELS[dispute.status]}
            </StatusPill>
          </dd>
          <dt className="text-muted-ink">Opération</dt>
          <dd>
            {OPERATION_TYPE_LABELS[operation.type]} · {amount(operation)}
            <span className="block text-[13px] text-muted-ink">
              {operation.reference} · {formatDateTime(operation.createdAt)}
            </span>
          </dd>
          <dt className="text-muted-ink">Client</dt>
          <dd>
            {customer.firstName} {customer.lastName}
            <span className="block text-[13px] text-muted-ink">Compte {dispute.account.number}</span>
          </dd>
          <dt className="text-muted-ink">Ouverte le</dt>
          <dd>{formatDateTime(dispute.createdAt)}</dd>
        </dl>

        <section aria-labelledby="dispute-thread" className="flex flex-col gap-3">
          <h3 id="dispute-thread" className="font-display text-[18px] font-bold">
            Messages
          </h3>
          {dispute.messages.length === 0 ? (
            <p className="text-[15px] text-muted-ink">Aucun message.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {dispute.messages.map((message, index) => {
                const fromCustomer = message.author === "CUSTOMER";
                return (
                  <li
                    // Messages carry no id; their order never changes.
                    key={index}
                    className={cn(
                      "flex flex-col gap-1 rounded-control px-4 py-3",
                      fromCustomer ? "mr-8 bg-brand-soft" : "ml-8 bg-canvas",
                    )}
                  >
                    <p className="text-[13px] text-muted-ink">
                      <span className="font-semibold text-ink">{fromCustomer ? "Client" : "Quincaillerie"}</span>
                      {" · "}
                      {message.authorName.firstName} {message.authorName.lastName} ·{" "}
                      {formatDateTime(message.createdAt)}
                    </p>
                    {/* User text: plain text, line breaks kept. */}
                    <p className="text-[15px] break-words whitespace-pre-line">{message.body}</p>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}

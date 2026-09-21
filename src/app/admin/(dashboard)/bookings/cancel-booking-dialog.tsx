"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { formatPrice } from "@/lib/format/price";
import {
  computeCancellationCharge,
  type CancellationReason,
} from "@/lib/admin/cancellation";
import {
  cancelBookingAction,
  type CancelBookingState,
} from "./actions";

interface CancelBookingDialogProps {
  bookingId: string;
  departureId: string;
  registrantName: string;
  participants: number;
  /** Net amount paid (v1: full total when paid, else 0) — drives the refund preview. */
  amountPaid: number;
  /** Departure date "YYYY-MM-DD" for the #13 day-tier preview. */
  departureDate: string;
}

const REASON_LABELS: Record<CancellationReason, string> = {
  customer_request: "ביטול ביוזמת הלקוח (חלים דמי ביטול)",
  departure_cancelled: "ביטול מצד החברה (החזר מלא)",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
    >
      {pending ? "מבטל…" : "בטל את ההזמנה"}
    </button>
  );
}

export function CancelBookingDialog(props: CancelBookingDialogProps) {
  const { bookingId, departureId, registrantName, participants, amountPaid, departureDate } =
    props;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<CancellationReason>("customer_request");
  const [state, formAction] = useActionState<CancelBookingState, FormData>(
    cancelBookingAction,
    {},
  );

  const charge = computeCancellationCharge({
    departureDate,
    participants,
    amountPaid,
    reason,
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-red-600 hover:underline"
      >
        ביטול
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-lg">
        <h2 className="text-lg font-bold text-ink">
          ביטול ההזמנה של {registrantName}
        </h2>

        {state.done ? (
          <div className="mt-4">
            <p className="rounded-lg bg-primary/10 p-3 text-sm text-ink">
              ההזמנה בוטלה. סכום שהוחזר: {formatPrice(state.refundAmount ?? 0)}.
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium"
              >
                סגירה
              </button>
            </div>
          </div>
        ) : (
          <form action={formAction} className="mt-4 space-y-4">
            <input type="hidden" name="booking_id" value={bookingId} />
            <input type="hidden" name="departure_id" value={departureId} />
            <input type="hidden" name="reason" value={reason} />

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink">סיבת הביטול</span>
              <select
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value as CancellationReason)
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {(
                  Object.keys(REASON_LABELS) as CancellationReason[]
                ).map((value) => (
                  <option key={value} value={value}>
                    {REASON_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-lg border border-border text-sm">
              <div className="flex justify-between border-b border-border px-3 py-2">
                <span>שולם</span>
                <b>{formatPrice(amountPaid)}</b>
              </div>
              <div className="flex justify-between border-b border-border px-3 py-2">
                <span>
                  דמי ביטול
                  {charge.daysUntilDeparture >= 0
                    ? ` · ${charge.daysUntilDeparture} ימים ליציאה`
                    : ""}
                </span>
                <b>−{formatPrice(charge.totalFee)}</b>
              </div>
              <div className="flex justify-between bg-primary/10 px-3 py-2">
                <b>להחזר ללקוח</b>
                <b className="text-primary">{formatPrice(charge.refundAmount)}</b>
              </div>
            </div>

            {state.error && (
              <p className="text-sm text-red-600">{state.error}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium"
              >
                חזרה
              </button>
              <SubmitButton />
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

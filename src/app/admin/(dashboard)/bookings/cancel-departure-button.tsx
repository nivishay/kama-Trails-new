"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { formatPrice } from "@/lib/format/price";
import {
  cancelDepartureAction,
  type CancelDepartureState,
} from "../departures/actions";

interface CancelDepartureButtonProps {
  departureId: string;
  /** Active bookings that will be refunded in full (#58) — shown so the admin knows the blast radius. */
  activeBookings: number;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
    >
      {pending ? "מבטל…" : "בטל את היציאה והחזר לכולם"}
    </button>
  );
}

export function CancelDepartureButton({
  departureId,
  activeBookings,
}: CancelDepartureButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<CancelDepartureState, FormData>(
    cancelDepartureAction,
    {},
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        ביטול היציאה
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
        <h2 className="text-lg font-bold text-ink">ביטול היציאה</h2>

        {state.done ? (
          <div className="mt-4">
            <p className="rounded-lg bg-primary/10 p-3 text-sm text-ink">
              היציאה בוטלה. {state.cancelledBookings ?? 0} הזמנות בוטלו, סה״כ הוחזר{" "}
              {formatPrice(state.totalRefunded ?? 0)}.
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
            <input type="hidden" name="id" value={departureId} />
            <p className="text-sm text-muted-foreground">
              ביטול היציאה יבטל את כל {activeBookings} ההזמנות הפעילות ויחזיר לכל
              לקוח את מלוא הסכום ששולם (ללא דמי ביטול). לא ניתן לבטל פעולה זו.
            </p>

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

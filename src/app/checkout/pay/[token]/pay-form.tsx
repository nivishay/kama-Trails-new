"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format/price";
import { WAIVER_TEXT } from "@/lib/consents/waiver";
import { payBooking, type PayFormState } from "./actions";

const INITIAL: PayFormState = {};

/**
 * The pay-link consent + pay form (#32): the customer signs the two mandatory consents (and may
 * opt into the newsletter) for an existing admin-created booking, then pays the full amount.
 * Party size and contact are fixed by the admin, so only the consents are collected here.
 */
export function PayForm({
  token,
  bookingId,
  total,
}: {
  token: string;
  bookingId: string;
  total: number;
}) {
  const [state, formAction, pending] = useActionState(payBooking, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="booking_id" value={bookingId} />

      <div className="space-y-3 rounded-lg bg-muted/50 p-3 text-sm text-ink">
        <label className="flex items-start gap-2">
          <input type="checkbox" name="consent_policy" required className="mt-1" />
          <span>
            קראתי את{" "}
            <Link
              href="/cancellation-policy"
              className="text-primary underline"
              target="_blank"
            >
              מדיניות הביטולים
            </Link>{" "}
            ואני מסכים/ה
          </span>
        </label>

        <div>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              name="consent_waiver"
              required
              className="mt-1"
            />
            <span>קראתי, הבנתי ואני חותם/ת על כתב ההצהרה והוויתור</span>
          </label>
          <details className="mt-1 ps-6">
            <summary className="cursor-pointer text-primary underline">
              קריאת כתב ההצהרה והוויתור
            </summary>
            <p className="mt-2 whitespace-pre-line rounded-md bg-background p-2 text-xs text-muted-foreground">
              {WAIVER_TEXT}
            </p>
          </details>
        </div>

        <label className="flex items-start gap-2 border-t border-border pt-3">
          <input type="checkbox" name="consent_marketing" className="mt-1" />
          <span>אשמח לקבל עדכונים על טיולים חדשים ומבצעים (לא חובה)</span>
        </label>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-sm text-muted-foreground">סה״כ לתשלום</span>
        <span className="text-xl font-bold text-ink">{formatPrice(total)}</span>
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={pending}
      >
        {pending ? "מעבירים לתשלום…" : "המשך לתשלום"}
      </Button>
    </form>
  );
}

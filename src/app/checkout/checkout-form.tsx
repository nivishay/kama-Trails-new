"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format/price";
import { WAIVER_TEXT } from "@/lib/consents/waiver";
import { startCheckout, type CheckoutFormState } from "./actions";

const INITIAL: CheckoutFormState = {};
const FIELD =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CheckoutForm({
  departureId,
  pricePerPerson,
  maxParticipants,
}: {
  departureId: string;
  pricePerPerson: number;
  maxParticipants: number;
}) {
  const [state, formAction, pending] = useActionState(startCheckout, INITIAL);
  const [participants, setParticipants] = useState(1);
  const total = pricePerPerson * participants;
  const cap = Math.max(1, maxParticipants);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="departure_id" value={departureId} />

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">
          מספר משתתפים
        </label>
        <input
          type="number"
          name="participants"
          min={1}
          max={cap}
          required
          value={participants}
          onChange={(event) =>
            setParticipants(
              Math.min(cap, Math.max(1, Number(event.target.value) || 1)),
            )
          }
          className={FIELD}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">
          שם מלא
        </label>
        <input
          type="text"
          name="registrant_name"
          required
          autoComplete="name"
          className={FIELD}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">
            טלפון
          </label>
          <input
            type="tel"
            name="phone"
            required
            autoComplete="tel"
            dir="ltr"
            className={FIELD}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">
            אימייל
          </label>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            dir="ltr"
            className={FIELD}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-lg bg-muted/50 p-3 text-sm text-ink">
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            name="consent_policy"
            required
            className="mt-1"
          />
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

        {/* Signed waiver (DECISIONS #59): a basic e-signature — the tick + the versioned text
            is the "ref to what he signed"; the booker signs under ייפוי-כוח for all participants.
            The expandable text is a SIBLING of the label, so reading it never toggles the box. */}
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

        {/* Newsletter / Marketing Consent (DECISIONS #55/#59): optional, unticked by default,
            never blocks booking; writes to the Customer, not the booking. */}
        <label className="flex items-start gap-2 border-t border-border pt-3">
          <input type="checkbox" name="consent_marketing" className="mt-1" />
          <span>
            אשמח לקבל עדכונים על טיולים חדשים ומבצעים (לא חובה)
          </span>
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

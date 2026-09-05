"use client";

import { useActionState, useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PayLinkResult } from "../pay-link-result";
import { addLateParticipant, type LateAddState } from "./actions";

const fieldClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-ring";

/**
 * Collapsible "add a late participant" panel on the departure bookings page (#32). Adds an
 * admin-created booking to this departure and shows the pay-link to send to the participant.
 */
export function LateAddForm({ departureId }: { departureId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<LateAddState, FormData>(
    addLateParticipant,
    {},
  );

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <UserPlus className="size-4" />
        הוספת משתתף
      </Button>
    );
  }

  if (state.payLink) {
    return (
      <PayLinkResult payLink={state.payLink} customerName={state.customerName} />
    );
  }

  return (
    <form
      action={formAction}
      className="max-w-lg space-y-3 rounded-xl border border-border bg-background p-4"
    >
      <h2 className="text-sm font-semibold text-ink">הוספת משתתף מאוחר</h2>
      <input type="hidden" name="departure_id" value={departureId} />

      <input
        type="text"
        name="registrant_name"
        placeholder="שם מלא"
        required
        className={fieldClass}
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          type="tel"
          name="phone"
          placeholder="טלפון"
          required
          dir="ltr"
          className={fieldClass}
        />
        <input
          type="email"
          name="email"
          placeholder="אימייל"
          required
          dir="ltr"
          className={fieldClass}
        />
      </div>
      <input
        type="number"
        name="participants"
        min={1}
        step={1}
        defaultValue={1}
        required
        className={fieldClass}
      />

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "מוסיף…" : "הוסף וצור קישור תשלום"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          ביטול
        </Button>
      </div>
    </form>
  );
}

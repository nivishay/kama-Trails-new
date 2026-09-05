"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { TrailOption } from "@/lib/admin/departures";
import { PayLinkResult } from "../pay-link-result";
import { createPrivateTrip, type PrivateTripState } from "./actions";

const fieldClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-ring";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

export function PrivateTripForm({ trails }: { trails: TrailOption[] }) {
  const [state, formAction, pending] = useActionState<
    PrivateTripState,
    FormData
  >(createPrivateTrip, {});

  if (state.payLink) {
    return (
      <div className="max-w-lg space-y-4">
        <PayLinkResult
          payLink={state.payLink}
          customerName={state.customerName}
        />
        <Button variant="outline" onClick={() => window.location.reload()}>
          יצירת טיול פרטי נוסף
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <Field label="מסלול">
        <select name="trail_id" required defaultValue="" className={fieldClass}>
          <option value="" disabled>
            בחרו מסלול…
          </option>
          {trails.map((trail) => (
            <option key={trail.id} value={trail.id}>
              {trail.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="תאריך">
          <input type="date" name="date" required className={fieldClass} />
        </Field>
        <Field label="שעה (לא חובה)">
          <input type="time" name="departure_time" className={fieldClass} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="מחיר לאדם (₪)">
          <input
            type="number"
            name="price"
            min={1}
            step={1}
            required
            className={fieldClass}
          />
        </Field>
        <Field label="מספר משתתפים">
          <input
            type="number"
            name="participants"
            min={1}
            step={1}
            required
            defaultValue={1}
            className={fieldClass}
          />
        </Field>
      </div>

      <Field label="שם איש הקשר">
        <input
          type="text"
          name="registrant_name"
          required
          className={fieldClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="טלפון">
          <input
            type="tel"
            name="phone"
            required
            dir="ltr"
            className={fieldClass}
          />
        </Field>
        <Field label="אימייל">
          <input
            type="email"
            name="email"
            required
            dir="ltr"
            className={fieldClass}
          />
        </Field>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "יוצר…" : "צור טיול פרטי וקבל קישור תשלום"}
      </Button>
    </form>
  );
}

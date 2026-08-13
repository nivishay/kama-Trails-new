"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { DepartureStatus } from "@/lib/catalog/types";
import type { TrailOption } from "@/lib/admin/departures";
import type { DepartureFormState } from "./actions";

const STATUS_LABELS: Record<DepartureStatus, string> = {
  open: "פתוח",
  closed: "סגור",
  cancelled: "מבוטל",
};

export interface DepartureFormValues {
  id?: string;
  trail_id?: string;
  date?: string;
  departure_time?: string | null;
  price?: number;
  min_capacity?: number;
  max_capacity?: number;
  status?: DepartureStatus;
}

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

export function DepartureForm({
  action,
  trails,
  initial,
  submitLabel,
}: {
  action: (
    state: DepartureFormState,
    formData: FormData,
  ) => Promise<DepartureFormState>;
  trails: TrailOption[];
  initial?: DepartureFormValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<
    DepartureFormState,
    FormData
  >(action, {});

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <Field label="מסלול">
        <select
          name="trail_id"
          required
          defaultValue={initial?.trail_id ?? ""}
          className={fieldClass}
        >
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
          <input
            type="date"
            name="date"
            required
            defaultValue={initial?.date ?? ""}
            className={fieldClass}
          />
        </Field>
        <Field label="שעה">
          <input
            type="time"
            name="departure_time"
            defaultValue={initial?.departure_time ?? ""}
            className={fieldClass}
          />
        </Field>
      </div>

      <Field label="מחיר לאדם (₪)">
        <input
          type="number"
          name="price"
          min={0}
          step={1}
          required
          defaultValue={initial?.price ?? ""}
          className={fieldClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="מינימום משתתפים">
          <input
            type="number"
            name="min_capacity"
            min={0}
            step={1}
            required
            defaultValue={initial?.min_capacity ?? 0}
            className={fieldClass}
          />
        </Field>
        <Field label="קיבולת מרבית">
          <input
            type="number"
            name="max_capacity"
            min={1}
            step={1}
            required
            defaultValue={initial?.max_capacity ?? 20}
            className={fieldClass}
          />
        </Field>
      </div>

      <Field label="סטטוס">
        <select
          name="status"
          defaultValue={initial?.status ?? "open"}
          className={fieldClass}
        >
          {(Object.keys(STATUS_LABELS) as DepartureStatus[]).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </Field>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "שומר…" : submitLabel}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/departures">ביטול</Link>
        </Button>
      </div>
    </form>
  );
}

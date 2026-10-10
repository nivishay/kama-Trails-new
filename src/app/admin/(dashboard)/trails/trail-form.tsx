"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { DIFFICULTIES, DIFFICULTY_LABELS } from "@/lib/catalog/difficulty";
import { REGION_LABELS } from "@/lib/catalog/region";
import { REGIONS } from "@/lib/admin/trail-form";
import type { Trail } from "@/lib/catalog/types";
import type { TrailFormState } from "./actions";
import { TrailImageFields } from "./trail-image-fields";

const fieldClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-ring";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && (
        <span className="block text-xs text-muted-foreground">{hint}</span>
      )}
    </label>
  );
}

export function TrailForm({
  action,
  initial,
  submitLabel,
}: {
  action: (
    state: TrailFormState,
    formData: FormData,
  ) => Promise<TrailFormState>;
  initial?: Trail;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<TrailFormState, FormData>(
    action,
    {},
  );
  // Controlled so the image uploader knows which `<slug>/…` folder to upload to.
  const [slug, setSlug] = useState(initial?.slug ?? "");

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="שם המסלול">
          <input
            type="text"
            name="name"
            required
            defaultValue={initial?.name ?? ""}
            className={fieldClass}
          />
        </Field>
        <Field label="שם קצר" hint="מוצג בכרטיס המסלול וברשימות.">
          <input
            type="text"
            name="short_name"
            required
            defaultValue={initial?.short_name ?? ""}
            className={fieldClass}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="מזהה כתובת (slug)"
          hint="אותיות לטיניות קטנות, ספרות ומקפים בלבד. משמש בכתובת העמוד."
        >
          <input
            type="text"
            name="slug"
            required
            dir="ltr"
            placeholder="nahal-example"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="סדר תצוגה" hint="מספר נמוך מופיע ראשון.">
          <input
            type="number"
            name="sort_order"
            min={0}
            step={1}
            defaultValue={initial?.sort_order ?? 0}
            className={fieldClass}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="אזור">
          <select
            name="region"
            required
            defaultValue={initial?.region ?? ""}
            className={fieldClass}
          >
            <option value="" disabled>
              בחרו אזור…
            </option>
            {REGIONS.map((region) => (
              <option key={region} value={region}>
                {REGION_LABELS[region]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="תווית אזור" hint='טקסט חופשי, למשל "צפון · רמת הגולן".'>
          <input
            type="text"
            name="region_label"
            defaultValue={initial?.region_label ?? ""}
            className={fieldClass}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="רמת קושי">
          <select
            name="difficulty"
            defaultValue={initial?.difficulty ?? ""}
            className={fieldClass}
          >
            <option value="">— ללא —</option>
            {DIFFICULTIES.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {DIFFICULTY_LABELS[difficulty]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="תווית רמת קושי" hint="טקסט חופשי שמוצג למטייל.">
          <input
            type="text"
            name="difficulty_label"
            defaultValue={initial?.difficulty_label ?? ""}
            className={fieldClass}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="מחיר ברירת מחדל (₪)" hint="המחיר בפועל נקבע בכל יציאה.">
          <input
            type="number"
            name="price"
            min={0}
            step={1}
            required
            defaultValue={initial?.price ?? 180}
            className={fieldClass}
          />
        </Field>
        <Field label="גובה / מפלים">
          <input
            type="text"
            name="height"
            defaultValue={initial?.height ?? ""}
            className={fieldClass}
          />
        </Field>
        <Field label="משך">
          <input
            type="text"
            name="duration"
            placeholder="יום טיול מלא"
            defaultValue={initial?.duration ?? ""}
            className={fieldClass}
          />
        </Field>
      </div>

      <Field label="תקציר" hint="משפט קצר לכרטיס המסלול.">
        <textarea
          name="excerpt"
          rows={2}
          defaultValue={initial?.excerpt ?? ""}
          className={fieldClass}
        />
      </Field>

      <Field label="תיאור מלא">
        <textarea
          name="description"
          rows={5}
          defaultValue={initial?.description ?? ""}
          className={fieldClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="ציוד נדרש">
          <textarea
            name="gear"
            rows={3}
            defaultValue={initial?.gear ?? ""}
            className={fieldClass}
          />
        </Field>
        <Field label="למי מתאים">
          <textarea
            name="audience"
            rows={3}
            defaultValue={initial?.audience ?? ""}
            className={fieldClass}
          />
        </Field>
        <Field label="מה כולל">
          <textarea
            name="included"
            rows={3}
            defaultValue={initial?.included ?? ""}
            className={fieldClass}
          />
        </Field>
      </div>

      <TrailImageFields
        slug={slug}
        initialHero={initial?.hero_image ?? null}
        initialGallery={initial?.gallery ?? []}
      />

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
          <Link href="/admin/trails">ביטול</Link>
        </Button>
      </div>
    </form>
  );
}

import { createTrail } from "../actions";
import { TrailForm } from "../trail-form";

export default function NewTrailPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">מסלול חדש</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        הוספת מסלול חדש לקטלוג. לאחר השמירה ניתן לפתוח לו תאריכים ב״יציאות״.
      </p>
      <TrailForm action={createTrail} submitLabel="צור מסלול" />
    </div>
  );
}

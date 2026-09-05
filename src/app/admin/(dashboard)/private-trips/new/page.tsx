import { getTrailOptions } from "@/lib/admin/departures";
import { PrivateTripForm } from "../private-trip-form";

export default async function NewPrivateTripPage() {
  const trails = await getTrailOptions();

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">טיול פרטי</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        יצירת יציאה פרטית (לא מופיעה בקטלוג) של מסלול קיים, ושליחת קישור תשלום ללקוח.
      </p>
      <PrivateTripForm trails={trails} />
    </div>
  );
}

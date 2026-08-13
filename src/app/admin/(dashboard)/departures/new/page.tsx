import { getTrailOptions } from "@/lib/admin/departures";
import { createDeparture } from "../actions";
import { DepartureForm } from "../departure-form";

export default async function NewDeparturePage() {
  const trails = await getTrailOptions();

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">יציאה חדשה</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        הוספת תאריך בוקינג חדש למסלול קיים.
      </p>
      <DepartureForm
        action={createDeparture}
        trails={trails}
        submitLabel="צור יציאה"
      />
    </div>
  );
}

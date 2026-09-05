import { notFound } from "next/navigation";
import { getDepartureById, getTrailOptions } from "@/lib/admin/departures";
import { utcIsoToIsraelWallTime } from "@/lib/format/timezone";
import { updateDeparture } from "../actions";
import { DepartureForm } from "../departure-form";

export default async function EditDeparturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [departure, trails] = await Promise.all([
    getDepartureById(id),
    getTrailOptions(),
  ]);

  if (!departure) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">עריכת יציאה</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        עדכון תאריך, שעה, מחיר, קיבולת או סטטוס.
      </p>
      <DepartureForm
        action={updateDeparture}
        trails={trails}
        initial={{
          ...departure,
          registration_closes_at: utcIsoToIsraelWallTime(
            departure.registration_closes_at,
          ),
        }}
        submitLabel="שמור שינויים"
      />
    </div>
  );
}

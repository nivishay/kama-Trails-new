import { notFound } from "next/navigation";
import { getTrailById } from "@/lib/admin/trails";
import { updateTrail } from "../actions";
import { TrailForm } from "../trail-form";

export default async function EditTrailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trail = await getTrailById(id);

  if (!trail) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">עריכת מסלול</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        עדכון פרטי המסלול, התמונות והתוכן המוצגים באתר.
      </p>
      <TrailForm action={updateTrail} initial={trail} submitLabel="שמור שינויים" />
    </div>
  );
}

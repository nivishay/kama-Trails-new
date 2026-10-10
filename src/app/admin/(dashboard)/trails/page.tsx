import Link from "next/link";
import { Plus, Pencil, ExternalLink } from "lucide-react";
import { getAdminTrails } from "@/lib/admin/trails";
import { REGION_LABELS } from "@/lib/catalog/region";
import { DIFFICULTY_LABELS } from "@/lib/catalog/difficulty";
import { formatPrice } from "@/lib/format/price";
import { Button } from "@/components/ui/button";
import { DeleteTrailButton } from "./delete-trail-button";

const CELL = "px-3 py-3 text-sm text-ink";
const HEAD = "px-3 py-2 text-right text-xs font-semibold text-muted-foreground";

export default async function TrailsPage() {
  const trails = await getAdminTrails();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">מסלולים</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ניהול המסלולים המוצגים באתר. לפתיחת תאריכים להרשמה עברו ל״יציאות״.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/trails/new">
            <Plus className="size-4" />
            מסלול חדש
          </Link>
        </Button>
      </div>

      {trails.length === 0 ? (
        <p className="mt-8 rounded-xl border border-border bg-background p-6 text-sm text-muted-foreground">
          אין עדיין מסלולים. הוסיפו מסלול חדש כדי להתחיל.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-background">
          <table className="w-full min-w-[640px] border-collapse">
            <thead className="border-b border-border">
              <tr>
                <th className={HEAD}>סדר</th>
                <th className={HEAD}>מסלול</th>
                <th className={HEAD}>אזור</th>
                <th className={HEAD}>רמת קושי</th>
                <th className={HEAD}>מחיר</th>
                <th className={HEAD}></th>
              </tr>
            </thead>
            <tbody>
              {trails.map((trail) => (
                <tr
                  key={trail.id}
                  className="border-b border-border last:border-0"
                >
                  <td className={CELL}>{trail.sort_order}</td>
                  <td className={CELL}>
                    <div className="font-medium">{trail.name}</div>
                    <div className="text-xs text-muted-foreground" dir="ltr">
                      {trail.slug}
                    </div>
                  </td>
                  <td className={CELL}>{REGION_LABELS[trail.region]}</td>
                  <td className={CELL}>
                    {trail.difficulty
                      ? DIFFICULTY_LABELS[trail.difficulty]
                      : "—"}
                  </td>
                  <td className={CELL}>{formatPrice(trail.price)}</td>
                  <td className={CELL}>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/trails/${trail.id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        <Pencil className="size-3.5" />
                        עריכה
                      </Link>
                      <Link
                        href={`/trails/${trail.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-ink"
                      >
                        <ExternalLink className="size-3.5" />
                        צפייה
                      </Link>
                      <DeleteTrailButton
                        trailId={trail.id}
                        trailName={trail.name}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

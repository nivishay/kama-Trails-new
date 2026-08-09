import Link from "next/link";
import { Plus, Pencil, Users } from "lucide-react";
import { getAdminDepartures } from "@/lib/admin/departures";
import type { DepartureStatus } from "@/lib/catalog/types";
import { capacityLabel } from "@/lib/catalog/availability";
import {
  formatHebrewWeekday,
  formatTrailDate,
  isPastDate,
} from "@/lib/format/date";
import { formatPrice } from "@/lib/format/price";
import { Button } from "@/components/ui/button";

const STATUS_STYLES: Record<DepartureStatus, { label: string; className: string }> =
  {
    open: { label: "פתוח", className: "bg-primary/15 text-primary" },
    closed: { label: "סגור", className: "bg-muted text-muted-foreground" },
    cancelled: { label: "מבוטל", className: "bg-red-100 text-red-700" },
  };

function StatusBadge({ status }: { status: DepartureStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${style.className}`}
    >
      {style.label}
    </span>
  );
}

const CELL = "px-3 py-3 text-sm text-ink";
const HEAD = "px-3 py-2 text-right text-xs font-semibold text-muted-foreground";

export default async function DeparturesPage() {
  const departures = await getAdminDepartures();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">יציאות</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ניהול תאריכים, קיבולת, מחיר וסטטוס.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/departures/new">
            <Plus className="size-4" />
            יציאה חדשה
          </Link>
        </Button>
      </div>

      {departures.length === 0 ? (
        <p className="mt-8 rounded-xl border border-border bg-background p-6 text-sm text-muted-foreground">
          אין עדיין יציאות. הוסיפו יציאה חדשה כדי להתחיל.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-background">
          <table className="w-full min-w-[720px] border-collapse">
            <thead className="border-b border-border">
              <tr>
                <th className={HEAD}>תאריך</th>
                <th className={HEAD}>שעה</th>
                <th className={HEAD}>מסלול</th>
                <th className={HEAD}>מחיר</th>
                <th className={HEAD}>תפוסה</th>
                <th className={HEAD}>מינימום</th>
                <th className={HEAD}>סטטוס</th>
                <th className={HEAD}></th>
              </tr>
            </thead>
            <tbody>
              {departures.map((departure) => {
                const past = isPastDate(departure.date);
                return (
                  <tr
                    key={departure.id}
                    className={`border-b border-border last:border-0 ${past ? "opacity-60" : ""}`}
                  >
                    <td className={CELL}>
                      <div className="font-medium">
                        {formatTrailDate(departure.date)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatHebrewWeekday(departure.date)}
                        {past && " · התקיים"}
                      </div>
                    </td>
                    <td className={CELL}>{departure.departure_time ?? "—"}</td>
                    <td className={CELL}>{departure.trail_name}</td>
                    <td className={CELL}>{formatPrice(departure.price)}</td>
                    <td className={CELL}>{capacityLabel(departure)}</td>
                    <td className={CELL}>{departure.min_capacity}</td>
                    <td className={CELL}>
                      <StatusBadge status={departure.status} />
                    </td>
                    <td className={CELL}>
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/departures/${departure.id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                          <Pencil className="size-3.5" />
                          עריכה
                        </Link>
                        <Link
                          href={`/admin/bookings/${departure.id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-ink"
                        >
                          <Users className="size-3.5" />
                          הזמנות
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

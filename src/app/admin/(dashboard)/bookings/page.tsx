import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getAdminDepartures } from "@/lib/admin/departures";
import { getDepartureBookingCounts } from "@/lib/admin/bookings";
import {
  formatHebrewWeekday,
  formatTrailDate,
  isPastDate,
} from "@/lib/format/date";

const CELL = "px-4 py-3 text-sm text-ink";
const HEAD = "px-4 py-2 text-right text-xs font-semibold text-muted-foreground";

export default async function BookingsIndexPage() {
  const [departures, counts] = await Promise.all([
    getAdminDepartures(),
    getDepartureBookingCounts(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">הזמנות</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        בחרו יציאה כדי לראות את כל ההזמנות שלה.
      </p>

      {departures.length === 0 ? (
        <p className="mt-8 rounded-xl border border-border bg-background p-6 text-sm text-muted-foreground">
          אין עדיין יציאות.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-background">
          <table className="w-full min-w-[640px] border-collapse">
            <thead className="border-b border-border">
              <tr>
                <th className={HEAD}>תאריך</th>
                <th className={HEAD}>מסלול</th>
                <th className={HEAD}>הזמנות</th>
                <th className={HEAD}>משתתפים</th>
                <th className={HEAD}></th>
              </tr>
            </thead>
            <tbody>
              {departures.map((departure) => {
                const past = isPastDate(departure.date);
                const stat = counts.get(departure.id);
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
                      </div>
                    </td>
                    <td className={CELL}>{departure.trail_name}</td>
                    <td className={CELL}>
                      <span className="font-semibold">
                        {stat?.bookings ?? 0}
                      </span>
                      {stat && stat.confirmed > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {" "}
                          ({stat.confirmed} מאושרות)
                        </span>
                      )}
                    </td>
                    <td className={CELL}>
                      {stat?.participants ?? 0}/{departure.max_capacity}
                    </td>
                    <td className={CELL}>
                      <Link
                        href={`/admin/bookings/${departure.id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        צפייה
                        <ChevronLeft className="size-4" />
                      </Link>
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

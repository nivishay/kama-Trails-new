import Link from "next/link";
import type { Route } from "next";
import type { DashboardDeparture } from "@/lib/admin/dashboard";

// A static, current-month calendar (design 1c). Server-rendered from the departures list — no
// interactivity in v1 (month navigation is a later enhancement). The month is the high-level view;
// each day carries a chip per departure, colour-coded by state.

const HEBREW_WEEKDAYS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const MONTH_FORMAT = new Intl.DateTimeFormat("he-IL", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "YYYY-MM-DD" for a given year/month(0-based)/day. */
function isoOf(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** A leading-null-padded list of day numbers for the month grid (null = blank cell). */
function monthCells(year: number, month: number): (number | null)[] {
  const startWeekday = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array.from({ length: startWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function chipClass(departure: DashboardDeparture): string {
  if (departure.status === "cancelled") {
    return "bg-muted text-muted-foreground line-through";
  }
  if (departure.free_spots <= 0) return "bg-ink text-ink-foreground";
  if (departure.belowMinimum) return "bg-amber-100 text-amber-800";
  return "bg-primary text-primary-foreground";
}

export function MonthCalendar({
  departures,
  now = new Date(),
}: {
  departures: DashboardDeparture[];
  now?: Date;
}) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  const byDate = new Map<string, DashboardDeparture[]>();
  for (const departure of departures) {
    const list = byDate.get(departure.date) ?? [];
    list.push(departure);
    byDate.set(departure.date, list);
  }

  const cells = monthCells(year, month);
  const monthLabel = MONTH_FORMAT.format(new Date(Date.UTC(year, month, 1)));

  return (
    <div dir="rtl">
      <h2 className="text-lg font-bold text-ink">{monthLabel}</h2>

      <div className="mt-3 overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-7 border-b border-border">
            {HEBREW_WEEKDAYS.map((day) => (
              <div
                key={day}
                className="px-2 py-1.5 text-center text-xs font-semibold text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-border">
            {cells.map((day, index) => {
              if (day === null) {
                return <div key={`blank-${index}`} className="min-h-24 bg-muted/40" />;
              }
              const iso = isoOf(year, month, day);
              const dayDepartures = byDate.get(iso) ?? [];
              const isToday = day === today;
              return (
                <div key={iso} className="min-h-24 bg-background p-1.5">
                  <div
                    className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                      isToday ? "bg-ink text-ink-foreground" : "text-ink"
                    }`}
                  >
                    {day}
                  </div>
                  <div className="mt-1 space-y-1">
                    {dayDepartures.map((departure) => (
                      <Link
                        key={departure.id}
                        href={`/admin/bookings/${departure.id}` as Route}
                        className={`block rounded px-1.5 py-1 text-[11px] leading-tight ${chipClass(departure)}`}
                      >
                        <span className="font-semibold">
                          {departure.departure_time
                            ? `${departure.departure_time} `
                            : ""}
                          {departure.trail_name}
                        </span>
                        <span className="block opacity-90">
                          {departure.booked}/{departure.max_capacity}
                          {departure.free_spots <= 0 ? " · מלא" : ""}
                          {departure.belowMinimum ? " · מתחת למינימום" : ""}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

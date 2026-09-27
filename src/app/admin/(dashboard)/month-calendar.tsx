import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import type { DashboardDeparture } from "@/lib/admin/dashboard";

// The month calendar (design 1c). Server-rendered from the departures list; month navigation is
// driven by a `?month=YYYY-MM` URL param so it stays a server component (no client state). Each
// day carries a chip per departure, colour-coded by state.

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

/** "YYYY-MM" param for a month, used by the prev/next links. */
function monthParam(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
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

// Chip colour by state. Order matters: cancelled wins, then private trips read as
// their own category (they're pre-arranged, so the public recruiting signals below
// don't apply — #59), then the occupancy signals for open registration trips (#60).
function chipClass(departure: DashboardDeparture): string {
  if (departure.status === "cancelled") {
    return "bg-muted text-muted-foreground line-through";
  }
  if (departure.is_private) return "bg-violet-100 text-violet-800";
  if (departure.free_spots <= 0) return "bg-ink text-ink-foreground";
  if (departure.belowMinimum) return "bg-amber-100 text-amber-800";
  return "bg-primary text-primary-foreground";
}

// Legend entries mirror chipClass so admins can read the calendar's colours.
const LEGEND: { label: string; swatch: string; private?: boolean }[] = [
  { label: "מקומות פנויים", swatch: "bg-primary" },
  { label: "מתחת למינימום", swatch: "bg-amber-100 ring-1 ring-amber-300" },
  { label: "מלא", swatch: "bg-ink" },
  { label: "טיול פרטי", swatch: "bg-violet-100 ring-1 ring-violet-300", private: true },
  { label: "בוטל", swatch: "bg-muted ring-1 ring-border" },
];

export function MonthCalendar({
  departures,
  monthDate,
  today = new Date(),
}: {
  departures: DashboardDeparture[];
  /** First day of the month to display. */
  monthDate: Date;
  /** Actual "now", so the today-marker only shows when viewing the current month. */
  today?: Date;
}) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();
  // Date-only "today" so past days (any month before this, or earlier this month)
  // can be faded out (#61). Today itself is not past.
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const byDate = new Map<string, DashboardDeparture[]>();
  for (const departure of departures) {
    const list = byDate.get(departure.date) ?? [];
    list.push(departure);
    byDate.set(departure.date, list);
  }

  const cells = monthCells(year, month);
  const monthLabel = MONTH_FORMAT.format(new Date(Date.UTC(year, month, 1)));
  const prevHref = `/admin?month=${monthParam(month === 0 ? year - 1 : year, (month + 11) % 12)}#calendar` as Route;
  const nextHref = `/admin?month=${monthParam(month === 11 ? year + 1 : year, (month + 1) % 12)}#calendar` as Route;

  return (
    <div dir="rtl" id="calendar">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">{monthLabel}</h2>
        <div className="flex gap-1">
          <Link
            href={prevHref}
            aria-label="חודש קודם"
            className="flex size-8 items-center justify-center rounded-lg border border-border hover:bg-muted"
          >
            <ChevronRight className="size-4" />
          </Link>
          <Link
            href={nextHref}
            aria-label="חודש הבא"
            className="flex size-8 items-center justify-center rounded-lg border border-border hover:bg-muted"
          >
            <ChevronLeft className="size-4" />
          </Link>
        </div>
      </div>

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
              const isToday = isCurrentMonth && day === todayDate;
              const isPast = new Date(year, month, day) < todayStart;
              return (
                <div
                  key={iso}
                  className={`min-h-24 p-1.5 ${isPast ? "bg-muted/40" : "bg-background"}`}
                >
                  {/* Past days keep their chips but fade back — they've happened (#61). */}
                  <div className={isPast ? "opacity-60" : undefined}>
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
                            {departure.is_private && (
                              <Lock className="ml-0.5 inline size-3 align-[-2px]" />
                            )}
                            {departure.departure_time
                              ? `${departure.departure_time} `
                              : ""}
                            {departure.trail_name}
                          </span>
                          <span className="block opacity-90">
                            {departure.booked}/{departure.max_capacity}
                            {departure.is_private ? " · פרטי" : ""}
                            {!departure.is_private && departure.free_spots <= 0
                              ? " · מלא"
                              : ""}
                            {!departure.is_private && departure.belowMinimum
                              ? " · מתחת למינימום"
                              : ""}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {LEGEND.map((entry) => (
          <li key={entry.label} className="flex items-center gap-1.5">
            <span className={`size-3 rounded-sm ${entry.swatch}`} />
            {entry.private && <Lock className="size-3" />}
            {entry.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

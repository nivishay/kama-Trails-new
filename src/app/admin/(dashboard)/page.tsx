import type { Route } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Inbox,
  Users,
  type LucideIcon,
} from "lucide-react";
import { getDashboardData, type DashboardDeparture } from "@/lib/admin/dashboard";
import { formatHebrewWeekday, formatTrailDate } from "@/lib/format/date";
import { formatPrice } from "@/lib/format/price";
import { Button } from "@/components/ui/button";
import { MonthCalendar } from "./month-calendar";

const UPCOMING_CARD_LIMIT = 6;

interface Stat {
  label: string;
  value: number;
  icon: LucideIcon;
}

function StatTile({ stat }: { stat: Stat }) {
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{stat.label}</span>
        <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <stat.icon className="size-5" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-bold text-ink">{stat.value}</div>
    </div>
  );
}

/** Capacity bar: occupied seats over capacity, coloured by state. */
function CapacityBar({ departure }: { departure: DashboardDeparture }) {
  const pct = Math.min(
    100,
    Math.round((departure.booked / Math.max(1, departure.max_capacity)) * 100),
  );
  const color =
    departure.free_spots <= 0
      ? "bg-ink"
      : departure.belowMinimum
        ? "bg-amber-400"
        : "bg-primary";
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function UpcomingCard({ departure }: { departure: DashboardDeparture }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-xs font-semibold uppercase text-muted-foreground">
        {formatHebrewWeekday(departure.date)} · {formatTrailDate(departure.date)}
      </div>
      <div className="mt-1 font-bold text-ink">{departure.trail_name}</div>
      <div className="text-xs text-muted-foreground">
        {departure.departure_time ? `${departure.departure_time} · ` : ""}
        {formatPrice(departure.price)} לאדם
      </div>
      <div className="mt-3">
        <CapacityBar departure={departure} />
      </div>
      <div className="mt-1.5 flex justify-between text-xs">
        <span>
          <b>{departure.booked}</b>/{departure.max_capacity} משתתפים
          {departure.belowMinimum
            ? ` · חסרים ${departure.min_capacity - departure.booked}`
            : ""}
        </span>
        <Link
          href={`/admin/bookings/${departure.id}` as Route}
          className="font-medium text-primary hover:underline"
        >
          נרשמים
        </Link>
      </div>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const { stats, upcoming, attentionBelowMinimum, all } = await getDashboardData();

  const tiles: Stat[] = [
    { label: "יציאות קרובות", value: stats.upcomingDepartures, icon: CalendarDays },
    { label: "הזמנות מאושרות", value: stats.confirmedBookings, icon: CheckCircle2 },
    { label: "משתתפים מאושרים", value: stats.confirmedParticipants, icon: Users },
    { label: "פניות חדשות", value: stats.newLeads, icon: Inbox },
  ];

  const attentionCount = attentionBelowMinimum.length + (stats.newLeads > 0 ? 1 : 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">לוח בקרה</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {upcoming.length} יציאות קרובות · {attentionCount} דברים דורשים טיפול
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/private-trips/new">טיול פרטי</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/departures/new">+ יציאה חדשה</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <StatTile key={tile.label} stat={tile} />
        ))}
      </div>

      {attentionCount > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">דורש טיפול</h2>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
            {attentionBelowMinimum.map((departure) => (
              <div
                key={departure.id}
                className="flex items-center gap-3 p-4"
              >
                <AlertTriangle className="size-5 shrink-0 text-amber-500" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-ink">
                    מתחת למינימום · {departure.trail_name}{" "}
                    {formatTrailDate(departure.date)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {departure.booked} מתוך {departure.min_capacity} · חסרים{" "}
                    {departure.min_capacity - departure.booked}
                  </div>
                </div>
                <Link
                  href={`/admin/bookings/${departure.id}` as Route}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  פתח
                </Link>
              </div>
            ))}
            {stats.newLeads > 0 && (
              <div className="flex items-center gap-3 p-4">
                <Inbox className="size-5 shrink-0 text-primary" />
                <div className="flex-1 text-sm font-semibold text-ink">
                  {stats.newLeads} פניות חדשות
                </div>
                <Link
                  href="/admin/leads"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  לפניות
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-ink">היציאות הקרובות</h2>
            <Link
              href="/admin/departures"
              className="text-sm font-medium text-primary hover:underline"
            >
              כל היציאות
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.slice(0, UPCOMING_CARD_LIMIT).map((departure) => (
              <UpcomingCard key={departure.id} departure={departure} />
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-background p-4">
        <MonthCalendar departures={all} />
      </section>
    </div>
  );
}

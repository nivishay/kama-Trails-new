import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Clock } from "lucide-react";
import {
  getBookingsForDeparture,
  getDepartureHeader,
} from "@/lib/admin/bookings";
import { formatHebrewWeekday, formatTrailDate } from "@/lib/format/date";
import { formatPrice } from "@/lib/format/price";
import { BookingStatusBadge } from "../booking-status-badge";

const DATETIME_FORMAT = new Intl.DateTimeFormat("he-IL", {
  dateStyle: "short",
  timeStyle: "short",
});

const CELL = "px-4 py-3 text-sm text-ink align-top";
const HEAD = "px-4 py-2 text-right text-xs font-semibold text-muted-foreground";

export default async function DepartureBookingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [header, bookings] = await Promise.all([
    getDepartureHeader(id),
    getBookingsForDeparture(id),
  ]);

  if (!header) {
    notFound();
  }

  return (
    <div>
      <Link
        href="/admin/bookings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-ink"
      >
        <ChevronRight className="size-4" />
        חזרה להזמנות
      </Link>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-ink">{header.trail_name}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              {formatTrailDate(header.date)} · {formatHebrewWeekday(header.date)}
            </span>
            {header.departure_time && (
              <span className="flex items-center gap-1">
                <Clock className="size-4" />
                {header.departure_time}
              </span>
            )}
          </div>
        </div>
        <span className="text-sm text-muted-foreground">
          {bookings.length} הזמנות · קיבולת {header.max_capacity}
        </span>
      </div>

      {bookings.length === 0 ? (
        <p className="mt-8 rounded-xl border border-border bg-background p-6 text-sm text-muted-foreground">
          אין עדיין הזמנות ליציאה זו.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-background">
          <table className="w-full min-w-[760px] border-collapse">
            <thead className="border-b border-border">
              <tr>
                <th className={HEAD}>שם</th>
                <th className={HEAD}>טלפון</th>
                <th className={HEAD}>אימייל</th>
                <th className={HEAD}>משתתפים</th>
                <th className={HEAD}>סכום</th>
                <th className={HEAD}>סטטוס</th>
                <th className={HEAD}>נרשם</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="border-b border-border last:border-0"
                >
                  <td className={`${CELL} font-medium`}>
                    {booking.registrant_name}
                  </td>
                  <td className={CELL}>
                    <a
                      href={`tel:${booking.phone}`}
                      className="text-primary hover:underline"
                      dir="ltr"
                    >
                      {booking.phone}
                    </a>
                  </td>
                  <td className={CELL}>
                    <a
                      href={`mailto:${booking.email}`}
                      className="text-primary hover:underline"
                      dir="ltr"
                    >
                      {booking.email}
                    </a>
                  </td>
                  <td className={CELL}>{booking.participants_count}</td>
                  <td className={CELL}>{formatPrice(booking.total_amount)}</td>
                  <td className={CELL}>
                    <BookingStatusBadge status={booking.status} />
                  </td>
                  <td className={`${CELL} whitespace-nowrap text-muted-foreground`}>
                    {DATETIME_FORMAT.format(new Date(booking.created_at))}
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

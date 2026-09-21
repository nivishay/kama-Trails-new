import { isPastDate } from "@/lib/format/date";
import { getAdminStats, type AdminStats } from "./stats";
import { getAdminDepartures, type AdminDeparture } from "./departures";
import { getDepartureBookingCounts } from "./bookings";

// Assembles the hybrid dashboard (day-board + calendar) entirely from data that already exists:
// stats, admin departures (with DB-computed free_spots), and per-departure booking counts. No new
// tables or queries — the "needs attention" signals are derived here, per the redesign plan.

/** A departure enriched with occupancy + attention flags for the dashboard. */
export interface DashboardDeparture extends AdminDeparture {
  /** Occupied seats = capacity − free_spots (confirmed + unexpired holds). */
  booked: number;
  /** Total bookings on the departure (from the counts rollup). */
  bookings: number;
  /** Upcoming, open, and still short of its minimum → needs the admin to recruit or cancel (#52). */
  belowMinimum: boolean;
}

export interface DashboardData {
  stats: AdminStats;
  /** Non-past, non-cancelled departures, date ascending. */
  upcoming: DashboardDeparture[];
  /** The subset of upcoming departures below their minimum — the day-board's "needs attention". */
  attentionBelowMinimum: DashboardDeparture[];
  /** Every departure (incl. past/cancelled), for the month calendar grid. */
  all: DashboardDeparture[];
}

/** Load and derive everything the dashboard renders. */
export async function getDashboardData(
  now: Date = new Date(),
): Promise<DashboardData> {
  const [stats, departures, counts] = await Promise.all([
    getAdminStats(),
    getAdminDepartures(),
    getDepartureBookingCounts(),
  ]);

  const all: DashboardDeparture[] = departures.map((departure) => {
    const booked = Math.max(0, departure.max_capacity - departure.free_spots);
    const past = isPastDate(departure.date, now);
    const belowMinimum =
      !past &&
      departure.status !== "cancelled" &&
      booked < departure.min_capacity;
    return {
      ...departure,
      booked,
      bookings: counts.get(departure.id)?.bookings ?? 0,
      belowMinimum,
    };
  });

  const upcoming = all.filter(
    (departure) =>
      !isPastDate(departure.date, now) && departure.status !== "cancelled",
  );

  return {
    stats,
    upcoming,
    attentionBelowMinimum: upcoming.filter((departure) => departure.belowMinimum),
    all,
  };
}

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DepartureStatus } from "@/lib/catalog/types";

export type BookingStatus = "held" | "confirmed" | "cancelled" | "expired";

/** One booking on a departure, with the contact PII the admin needs. */
export interface AdminBooking {
  id: string;
  registrant_name: string;
  phone: string;
  email: string;
  participants_count: number;
  status: BookingStatus;
  total_amount: number;
  deposit_amount: number | null;
  cancellation_reason: string | null;
  created_at: string;
}

/** Per-departure booking rollup for the bookings index. */
export interface DepartureBookingCounts {
  bookings: number;
  confirmed: number;
  participants: number; // seats occupied: confirmed + held
}

const BOOKING_COLUMNS =
  "id, registrant_name, phone, email, participants_count, status, " +
  "total_amount, deposit_amount, cancellation_reason, created_at";

/** All bookings for one departure, oldest first. Admin-only (RLS). */
export async function getBookingsForDeparture(
  departureId: string,
): Promise<AdminBooking[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_COLUMNS)
    .eq("departure_id", departureId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load bookings: ${error.message}`);
  }
  return (data ?? []) as unknown as AdminBooking[];
}

/**
 * Booking rollups keyed by departure_id, for the bookings index. One read of all
 * bookings (admin RLS) aggregated in memory — booking volumes here are small.
 */
export async function getDepartureBookingCounts(): Promise<
  Map<string, DepartureBookingCounts>
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("departure_id, participants_count, status");

  if (error) {
    throw new Error(`Failed to load booking counts: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as {
    departure_id: string;
    participants_count: number;
    status: BookingStatus;
  }[];

  const counts = new Map<string, DepartureBookingCounts>();
  for (const row of rows) {
    const current =
      counts.get(row.departure_id) ??
      { bookings: 0, confirmed: 0, participants: 0 };
    current.bookings += 1;
    if (row.status === "confirmed") current.confirmed += 1;
    if (row.status === "confirmed" || row.status === "held") {
      current.participants += row.participants_count;
    }
    counts.set(row.departure_id, current);
  }
  return counts;
}

/** Header info for a single departure's bookings page. */
export interface DepartureHeader {
  id: string;
  trail_name: string;
  date: string;
  departure_time: string | null;
  status: DepartureStatus;
  max_capacity: number;
}

export async function getDepartureHeader(
  id: string,
): Promise<DepartureHeader | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("departures")
    .select("id, date, departure_time, status, max_capacity, trails(name)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load departure ${id}: ${error.message}`);
  }
  if (!data) return null;

  const row = data as unknown as {
    id: string;
    date: string;
    departure_time: string | null;
    status: DepartureStatus;
    max_capacity: number;
    trails: { name: string } | null;
  };
  return {
    id: row.id,
    trail_name: row.trails?.name ?? "—",
    date: row.date,
    departure_time: row.departure_time,
    status: row.status,
    max_capacity: row.max_capacity,
  };
}

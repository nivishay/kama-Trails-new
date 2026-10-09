import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DepartureStatus } from "@/lib/catalog/types";
import { payLinkForBooking } from "./pay-link";

export type BookingStatus = "held" | "confirmed" | "cancelled" | "expired";

/** Payment/receipt state for a booking, derived from the payments ledger (ADR 0001). */
export interface BookingPayment {
  paid: boolean;
  receiptNumber: number | null;
  receiptUrl: string | null;
  /** Paid, but the booking is not confirmed (expired/cancelled) — the #43 anomaly. */
  anomaly: boolean;
}

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
  payment: BookingPayment;
  /** The capability pay-link to send the customer — present only while the booking is `held`. */
  payLink: string | null;
}

/** Per-departure booking rollup for the bookings index. */
export interface DepartureBookingCounts {
  bookings: number;
  confirmed: number;
  participants: number; // seats occupied: confirmed + held
}

const BOOKING_COLUMNS =
  "id, registrant_name, phone, email, participants_count, status, " +
  "total_amount, deposit_amount, cancellation_reason, created_at, access_token";

interface BookingRow {
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
  access_token: string;
}

interface PaymentRow {
  booking_id: string;
  document_number: number | null;
  document_url: string | null;
}

/** All bookings for one departure, oldest first, with payment/receipt state. Admin-only (RLS). */
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
  const bookings = (data ?? []) as unknown as BookingRow[];
  if (bookings.length === 0) return [];

  // Read the ledger for paid state + receipt ref. Only charge rows carry the receipt — refund
  // rows (kind='refund') must never be mistaken for the payment that issued the חשבונית (#22).
  const { data: paymentData, error: paymentError } = await supabase
    .from("payments")
    .select("booking_id, document_number, document_url")
    .eq("status", "succeeded")
    .in("kind", ["deposit", "balance"])
    .in(
      "booking_id",
      bookings.map((booking) => booking.id),
    );

  if (paymentError) {
    throw new Error(`Failed to load payments: ${paymentError.message}`);
  }

  const paymentsByBooking = new Map<string, PaymentRow>();
  for (const payment of (paymentData ?? []) as unknown as PaymentRow[]) {
    paymentsByBooking.set(payment.booking_id, payment);
  }

  return bookings.map((booking) => {
    const payment = paymentsByBooking.get(booking.id);
    const paid = payment != null;
    // Keep the raw access_token internal — expose only the built pay-link (held bookings only).
    const { access_token, ...rest } = booking;
    return {
      ...rest,
      payLink: payLinkForBooking(booking.status, access_token),
      payment: {
        paid,
        receiptNumber: payment?.document_number ?? null,
        receiptUrl: payment?.document_url ?? null,
        anomaly: paid && booking.status !== "confirmed",
      },
    };
  });
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
    const current = counts.get(row.departure_id) ?? {
      bookings: 0,
      confirmed: 0,
      participants: 0,
    };
    current.bookings += 1;
    if (row.status === "confirmed") current.confirmed += 1;
    if (row.status === "confirmed" || row.status === "held") {
      current.participants += row.participants_count;
    }
    counts.set(row.departure_id, current);
  }
  return counts;
}

/** Everything the admin cancel/refund flow needs about one booking (DECISIONS #13/#15). */
export interface BookingCancelInfo {
  id: string;
  registrant_name: string;
  participants_count: number;
  status: BookingStatus;
  /** Departure calendar date (authoritative, from the departure), "YYYY-MM-DD". */
  departure_date: string;
  /** Net money received = Σ succeeded (deposit+balance) − Σ succeeded refunds. */
  amountPaid: number;
  /** The succeeded charge's provider transaction id to refund against, or null if never charged. */
  chargeProviderRef: string | null;
}

interface CancelBookingRow {
  id: string;
  registrant_name: string;
  participants_count: number;
  status: BookingStatus;
  departures: { date: string } | null;
}

interface LedgerRow {
  kind: "deposit" | "balance" | "refund";
  amount: number;
  provider_ref: string | null;
}

/**
 * Load a single booking plus its payment ledger, reduced to the paid amount and the charge txn to
 * refund against. Admin-only (RLS). Returns null if the booking does not exist.
 */
export async function getBookingCancelInfo(
  bookingId: string,
): Promise<BookingCancelInfo | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, registrant_name, participants_count, status, departures(date)",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load booking ${bookingId}: ${error.message}`);
  }
  if (!data) return null;
  const booking = data as unknown as CancelBookingRow;

  const { data: ledgerData, error: ledgerError } = await supabase
    .from("payments")
    .select("kind, amount, provider_ref")
    .eq("booking_id", bookingId)
    .eq("status", "succeeded");

  if (ledgerError) {
    throw new Error(`Failed to load payments: ${ledgerError.message}`);
  }
  const ledger = (ledgerData ?? []) as unknown as LedgerRow[];

  let amountPaid = 0;
  let chargeProviderRef: string | null = null;
  for (const row of ledger) {
    if (row.kind === "refund") {
      amountPaid -= row.amount;
    } else {
      amountPaid += row.amount;
      // Refund against the most recent charge that carries a provider transaction id.
      if (row.provider_ref) chargeProviderRef = row.provider_ref;
    }
  }

  return {
    id: booking.id,
    registrant_name: booking.registrant_name,
    participants_count: booking.participants_count,
    status: booking.status,
    departure_date: booking.departures?.date ?? "",
    amountPaid: Math.max(0, amountPaid),
    chargeProviderRef,
  };
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

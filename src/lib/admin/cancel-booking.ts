import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";
import {
  computeCancellationCharge,
  type CancellationReason,
} from "./cancellation";
import { getBookingsForDeparture } from "./bookings";

// Server-side orchestration for admin cancel + refund (DECISIONS #13/#15/#53/#58).
//
// Race-safety (QA sweep 2026-10-09): the booking is transitioned to cancelled FIRST, atomically,
// via admin_begin_cancellation under a row lock. Only the caller that actually performs the
// transition (did_cancel=true) goes on to refund at Cardcom — so two simultaneous cancels can no
// longer both issue a real refund. The refund is then recorded via admin_record_refund (idempotent).
// Reused by the single-booking flow (2a) and the bulk whole-departure flow (2b, full refund #58).

export interface CancelBookingResult {
  refundAmount: number;
  totalFee: number;
}

interface BeginCancellationRow {
  did_cancel: boolean;
  amount_paid: number;
  charge_provider_ref: string | null;
  departure_date: string | null;
  participants_count: number;
  status_before: string;
}

/** Cancel one booking, refunding paid − #13 fee (or a full refund for a company cancel #58). */
export async function cancelBookingWithRefund(
  bookingId: string,
  reason: CancellationReason,
): Promise<CancelBookingResult> {
  const supabase = await createSupabaseServerClient();

  // Phase 1 — atomically claim the cancellation. Only one concurrent caller gets did_cancel=true.
  const { data, error } = await supabase.rpc("admin_begin_cancellation", {
    p_booking_id: bookingId,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
  const claim = (data as unknown as BeginCancellationRow[] | null)?.[0];
  if (!claim) throw new Error("ההזמנה לא נמצאה");

  // Lost the race, or already cancelled — must NOT refund (that's what prevents a double refund).
  if (!claim.did_cancel) {
    return { refundAmount: 0, totalFee: 0 };
  }
  if (!claim.departure_date) {
    throw new Error("ליציאה של ההזמנה חסר תאריך");
  }

  const charge = computeCancellationCharge({
    departureDate: claim.departure_date,
    participants: claim.participants_count,
    amountPaid: claim.amount_paid,
    reason,
  });

  // Phase 2 — only the winner refunds + records. The booking is already cancelled at this point, so
  // a Cardcom failure surfaces loudly and the refund is completed manually (see migration note).
  if (charge.refundAmount > 0) {
    if (!claim.charge_provider_ref) {
      // Money is owed but there is no charge transaction to refund against — surface it rather than
      // silently strand the customer's money. The admin resolves it in Cardcom by hand.
      throw new Error("לא נמצאה עסקת חיוב להחזר — יש לטפל בהחזר ידנית");
    }
    const provider = getPaymentProvider();
    const result = await provider.refund({
      providerRef: claim.charge_provider_ref,
      amount: charge.refundAmount,
    });
    if (!result.success) {
      throw new Error("ההחזר נדחה על ידי חברת הסליקה");
    }
    const { error: recordError } = await supabase.rpc("admin_record_refund", {
      p_booking_id: bookingId,
      p_refund_amount: charge.refundAmount,
      p_refund_provider_ref: result.providerRef,
      p_provider: "cardcom",
    });
    if (recordError) throw new Error(recordError.message);
  }

  return { refundAmount: charge.refundAmount, totalFee: charge.totalFee };
}

export interface CancelDepartureResult {
  cancelledBookings: number;
  totalRefunded: number;
}

/**
 * Cancel a whole departure: full refund to every active booking (#58), then mark the departure
 * cancelled. Sequential so one refund failure surfaces before the departure flips — the remaining
 * bookings stay active and the admin can retry (already-cancelled bookings are skipped).
 */
export async function cancelDepartureWithRefunds(
  departureId: string,
): Promise<CancelDepartureResult> {
  const bookings = await getBookingsForDeparture(departureId);
  const active = bookings.filter(
    (booking) => booking.status !== "cancelled" && booking.status !== "expired",
  );

  let totalRefunded = 0;
  for (const booking of active) {
    const result = await cancelBookingWithRefund(booking.id, "departure_cancelled");
    totalRefunded += result.refundAmount;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("departures")
    .update({ status: "cancelled" })
    .eq("id", departureId);
  if (error) {
    throw new Error(`עדכון סטטוס היציאה נכשל: ${error.message}`);
  }

  return { cancelledBookings: active.length, totalRefunded };
}

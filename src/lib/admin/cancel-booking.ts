import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";
import {
  computeCancellationCharge,
  type CancellationReason,
} from "./cancellation";
import { getBookingCancelInfo, getBookingsForDeparture } from "./bookings";

// Server-side orchestration for admin cancel + refund (DECISIONS #13/#15/#53/#58). The money
// leaves Cardcom here (network), then admin_cancel_booking records the refund row and flips the
// booking to cancelled atomically. Reused by the single-booking flow (2a) and the bulk
// whole-departure flow (2b, always a full refund #58).

export interface CancelBookingResult {
  refundAmount: number;
  totalFee: number;
}

/** Cancel one booking, refunding paid − #13 fee (or a full refund for a company cancel #58). */
export async function cancelBookingWithRefund(
  bookingId: string,
  reason: CancellationReason,
): Promise<CancelBookingResult> {
  const info = await getBookingCancelInfo(bookingId);
  if (!info) throw new Error("ההזמנה לא נמצאה");
  if (info.status === "cancelled") {
    return { refundAmount: 0, totalFee: 0 }; // already cancelled — idempotent no-op
  }
  if (!info.departure_date) {
    throw new Error("ליציאה של ההזמנה חסר תאריך");
  }

  const charge = computeCancellationCharge({
    departureDate: info.departure_date,
    participants: info.participants_count,
    amountPaid: info.amountPaid,
    reason,
  });

  let refundProviderRef: string | null = null;
  if (charge.refundAmount > 0) {
    if (!info.chargeProviderRef) {
      // Money is owed but there is no charge transaction to refund against — refuse rather than
      // silently cancel and strand the customer's money. The admin resolves it in Cardcom by hand.
      throw new Error("לא נמצאה עסקת חיוב להחזר — יש לטפל בהחזר ידנית");
    }
    const provider = getPaymentProvider();
    const result = await provider.refund({
      providerRef: info.chargeProviderRef,
      amount: charge.refundAmount,
    });
    if (!result.success) {
      throw new Error("ההחזר נדחה על ידי חברת הסליקה");
    }
    refundProviderRef = result.providerRef;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_cancel_booking", {
    p_booking_id: bookingId,
    p_reason: reason,
    p_refund_amount: charge.refundAmount,
    p_refund_provider_ref: refundProviderRef,
  });
  if (error) throw new Error(error.message);

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

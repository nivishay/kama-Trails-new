"use server";

import { revalidatePath } from "next/cache";
import {
  createAdminBooking,
  toAdminBookingMessage,
} from "@/lib/admin/admin-created-bookings";
import { cancelBookingWithRefund } from "@/lib/admin/cancel-booking";
import type { CancellationReason } from "@/lib/admin/cancellation";

// Add a late Participant to an existing departure after public sales closed (#32/#51). Same
// admin-created booking primitive as a private trip; capacity-guarded, unbounded by the
// public registration deadline. Returns a pay-link for the added participant.

export type LateAddState = {
  error?: string;
  payLink?: string;
  customerName?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function addLateParticipant(
  _prev: LateAddState,
  formData: FormData,
): Promise<LateAddState> {
  const departureId = String(formData.get("departure_id") ?? "").trim();
  const name = String(formData.get("registrant_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const participants = Number(formData.get("participants"));

  if (!departureId) return { error: "חסר מזהה יציאה" };
  if (!name) return { error: "יש להזין שם מלא" };
  if (!phone) return { error: "יש להזין מספר טלפון" };
  if (!EMAIL_RE.test(email)) return { error: "כתובת אימייל לא תקינה" };
  if (!Number.isInteger(participants) || participants < 1) {
    return { error: "יש לבחור לפחות משתתף אחד" };
  }

  try {
    const { payLink } = await createAdminBooking(
      departureId,
      { name, phone, email },
      participants,
    );
    revalidatePath(`/admin/bookings/${departureId}`);
    return { payLink, customerName: name };
  } catch (error) {
    return { error: toAdminBookingMessage((error as Error).message) };
  }
}

// Admin-cancel a single booking (2a): refund paid − #13 fee (customer_request) or a full refund
// (departure_cancelled, #58), record it, flip the booking to cancelled. See cancelBookingWithRefund.
export type CancelBookingState = {
  error?: string;
  done?: boolean;
  refundAmount?: number;
};

const CANCEL_REASONS: CancellationReason[] = [
  "customer_request",
  "departure_cancelled",
];

export async function cancelBookingAction(
  _prev: CancelBookingState,
  formData: FormData,
): Promise<CancelBookingState> {
  const bookingId = String(formData.get("booking_id") ?? "").trim();
  const departureId = String(formData.get("departure_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!bookingId) return { error: "חסר מזהה הזמנה" };
  if (!CANCEL_REASONS.includes(reason as CancellationReason)) {
    return { error: "יש לבחור סיבת ביטול" };
  }

  try {
    const { refundAmount } = await cancelBookingWithRefund(
      bookingId,
      reason as CancellationReason,
    );
    if (departureId) revalidatePath(`/admin/bookings/${departureId}`);
    return { done: true, refundAmount };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

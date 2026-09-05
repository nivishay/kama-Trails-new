import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

// Shared orchestration for admin-created bookings (#32): the private-trip and late-add entry
// points both create a held booking via admin_create_booking and hand back a pay-link the admin
// sends to the customer (charge in full on open, pay-immediately #58).

export interface AdminBookingContact {
  name: string;
  phone: string;
  email: string;
}

interface HeldAdminBooking {
  id: string;
  access_token: string;
}

/** The public pay-link (a capability URL carrying the booking's access token). */
export function payLinkForToken(accessToken: string): string {
  return `${getSiteUrl()}/checkout/pay/${accessToken}`;
}

/** Map admin_create_booking DB errors to friendly Hebrew; keep the rest visible. */
export function toAdminBookingMessage(message: string): string {
  if (/seats remaining/.test(message)) return "אין מספיק מקומות פנויים ליציאה";
  if (/admin only/.test(message)) return "הפעולה מותרת למנהל בלבד";
  if (/name is required/.test(message)) return "יש להזין שם מלא";
  if (/phone is required/.test(message)) return "יש להזין מספר טלפון";
  if (/at least 1/.test(message)) return "יש לבחור לפחות משתתף אחד";
  return `יצירת ההזמנה נכשלה: ${message}`;
}

/**
 * Create an admin booking on an existing departure (the late-add case, and the second step of
 * a private trip) and return its pay-link. Capacity-guarded and admin-only in the DB.
 */
export async function createAdminBooking(
  departureId: string,
  contact: AdminBookingContact,
  participants: number,
): Promise<{ payLink: string; bookingId: string }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_create_booking", {
    p_departure_id: departureId,
    p_registrant_name: contact.name,
    p_phone: contact.phone,
    p_email: contact.email,
    p_participants_count: participants,
  });
  if (error) throw new Error(error.message);

  const booking = data as unknown as HeldAdminBooking;
  return { payLink: payLinkForToken(booking.access_token), bookingId: booking.id };
}

"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createAdminBooking,
  toAdminBookingMessage,
} from "@/lib/admin/admin-created-bookings";

// Private Trip (#32/#51): the admin picks a trail, sets a per-person price + date + party, and
// the system makes an UNLISTED (private) departure of that trail and books it — then hands back
// a pay-link. Pricing is identical to standard (participants × price_per_person).

/** On success we return the pay-link to show + copy; on failure, a Hebrew error. */
export type PrivateTripState = {
  error?: string;
  payLink?: string;
  customerName?: string;
};

interface PrivateTripInput {
  trailId: string;
  date: string;
  departureTime: string | null;
  pricePerPerson: number;
  participants: number;
  name: string;
  phone: string;
  email: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parsePrivateTripForm(formData: FormData): PrivateTripInput {
  const trailId = String(formData.get("trail_id") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const time = String(formData.get("departure_time") ?? "").trim();
  const pricePerPerson = Number(formData.get("price"));
  const participants = Number(formData.get("participants"));
  const name = String(formData.get("registrant_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!trailId) throw new Error("יש לבחור מסלול");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("תאריך לא תקין");
  if (!Number.isFinite(pricePerPerson) || pricePerPerson <= 0) {
    throw new Error("מחיר לאדם חייב להיות גדול מאפס");
  }
  if (!Number.isInteger(participants) || participants < 1) {
    throw new Error("יש לבחור לפחות משתתף אחד");
  }
  if (!name) throw new Error("יש להזין שם מלא");
  if (!phone) throw new Error("יש להזין מספר טלפון");
  if (!EMAIL_RE.test(email)) throw new Error("כתובת אימייל לא תקינה");

  return {
    trailId,
    date,
    departureTime: time || null,
    pricePerPerson,
    participants,
    name,
    phone,
    email,
  };
}

export async function createPrivateTrip(
  _prev: PrivateTripState,
  formData: FormData,
): Promise<PrivateTripState> {
  let input: PrivateTripInput;
  try {
    input = parsePrivateTripForm(formData);
  } catch (error) {
    return { error: (error as Error).message };
  }

  try {
    const supabase = await createSupabaseServerClient();

    // Unlisted departure of the chosen trail: closed + is_private keep it out of the public
    // catalog; capacity = the private party's size (a whole-group booking).
    const { data: departure, error: departureError } = await supabase
      .from("departures")
      .insert({
        trail_id: input.trailId,
        date: input.date,
        departure_time: input.departureTime,
        price: input.pricePerPerson,
        min_capacity: 0,
        max_capacity: input.participants,
        status: "closed",
        is_private: true,
      })
      .select("id")
      .single();
    if (departureError) {
      return { error: `יצירת היציאה הפרטית נכשלה: ${departureError.message}` };
    }

    const { payLink } = await createAdminBooking(
      (departure as { id: string }).id,
      { name: input.name, phone: input.phone, email: input.email },
      input.participants,
    );
    return { payLink, customerName: input.name };
  } catch (error) {
    return { error: toAdminBookingMessage((error as Error).message) };
  }
}

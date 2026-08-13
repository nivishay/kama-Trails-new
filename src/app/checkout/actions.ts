"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";
import { getSiteUrl } from "@/lib/site-url";

/** Result surfaced back to the checkout form via useActionState. On success we redirect. */
export type CheckoutFormState = { error?: string };

interface CheckoutInput {
  departureId: string;
  registrantName: string;
  phone: string;
  email: string;
  participants: number;
  acceptedTerms: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Parse + validate the checkout form; throws a Hebrew message on invalid input. */
function parseCheckoutForm(formData: FormData): CheckoutInput {
  const departureId = String(formData.get("departure_id") ?? "").trim();
  const registrantName = String(formData.get("registrant_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const participants = Number(formData.get("participants"));
  // Both consents are mandatory (#31): the risk waiver and the cancellation policy.
  const acceptedPolicy = formData.get("consent_policy") === "on";
  const acceptedRisk = formData.get("consent_risk") === "on";

  if (!departureId) throw new Error("חסר מזהה יציאה");
  if (!registrantName) throw new Error("יש להזין שם מלא");
  if (!phone) throw new Error("יש להזין מספר טלפון");
  if (!EMAIL_RE.test(email)) throw new Error("כתובת אימייל לא תקינה");
  if (!Number.isInteger(participants) || participants < 1) {
    throw new Error("יש לבחור לפחות משתתף אחד");
  }
  if (!acceptedPolicy || !acceptedRisk) {
    throw new Error("יש לאשר את שני התנאים כדי להמשיך");
  }

  return {
    departureId,
    registrantName,
    phone,
    email,
    participants,
    acceptedTerms: true,
  };
}

interface HeldBooking {
  id: string;
  access_token: string;
  deposit_amount: number;
  trail_name: string;
}

/** Create the held booking via book_trip (records consents + the seat hold). */
async function createHeldBooking(input: CheckoutInput): Promise<HeldBooking> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("book_trip", {
    p_departure_id: input.departureId,
    p_registrant_name: input.registrantName,
    p_phone: input.phone,
    p_email: input.email,
    p_participants_count: input.participants,
    p_accepted_terms: input.acceptedTerms,
  });
  if (error) throw new Error(error.message);

  const booking = data as unknown as HeldBooking;
  return booking;
}

/** Store the Cardcom session id on the held booking (token-guarded RPC, #38). */
async function attachSession(
  bookingId: string,
  accessToken: string,
  sessionId: string,
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("attach_payment_session", {
    p_booking_id: bookingId,
    p_access_token: accessToken,
    p_session_id: sessionId,
  });
  if (error) throw new Error(error.message);
}

export async function startCheckout(
  _prev: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  let input: CheckoutInput;
  try {
    input = parseCheckoutForm(formData);
  } catch (error) {
    return { error: (error as Error).message };
  }

  let redirectUrl: string;
  try {
    const booking = await createHeldBooking(input);

    const base = getSiteUrl();
    const provider = getPaymentProvider();
    const session = await provider.createCheckout({
      bookingId: booking.id,
      amount: Number(booking.deposit_amount),
      customerName: input.registrantName,
      customerEmail: input.email,
      description: `השתתפות בטיול ${booking.trail_name}`,
      successUrl: `${base}/checkout/success?token=${booking.access_token}`,
      failedUrl: `${base}/checkout/failed?token=${booking.access_token}`,
      webhookUrl: `${base}/api/cardcom/webhook`,
    });

    await attachSession(booking.id, booking.access_token, session.sessionId);
    redirectUrl = session.redirectUrl;
  } catch (error) {
    // book_trip capacity/closed errors carry a friendly Hebrew message; surface it.
    return { error: toCheckoutMessage((error as Error).message) };
  }

  // Redirect must live outside the try/catch (it throws NEXT_REDIRECT by design).
  redirect(redirectUrl);
}

/** Translate known book_trip errors to customer-facing Hebrew; keep the rest generic. */
function toCheckoutMessage(message: string): string {
  if (/seats remaining/.test(message))
    return "אין מספיק מקומות פנויים בתאריך שנבחר";
  if (/not open/.test(message)) return "התאריך שנבחר אינו פתוח להרשמה";
  if (/consent/.test(message)) return "יש לאשר את שני התנאים כדי להמשיך";
  return "אירעה תקלה בהפעלת התשלום. נסו שוב או צרו קשר.";
}

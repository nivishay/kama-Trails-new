"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";
import { getSiteUrl } from "@/lib/site-url";

// Pay-link payment (#32): the customer opens an admin-sent capability URL, signs the two
// mandatory consents and pays the full amount immediately (#58). Mirrors the self-serve
// startCheckout, but pays an EXISTING admin-created held booking instead of creating one.

export type PayFormState = { error?: string };

interface TokenBooking {
  id: string;
  status: string;
  trail_name: string;
  registrant_name: string;
  email: string;
  deposit_amount: number;
}

export async function payBooking(
  _prev: PayFormState,
  formData: FormData,
): Promise<PayFormState> {
  const token = String(formData.get("token") ?? "").trim();
  const bookingId = String(formData.get("booking_id") ?? "").trim();
  const acceptedPolicy = formData.get("consent_policy") === "on";
  const signedWaiver = formData.get("consent_waiver") === "on";
  const marketingOptIn = formData.get("consent_marketing") === "on";

  if (!token || !bookingId) return { error: "קישור התשלום אינו תקין" };
  if (!acceptedPolicy || !signedWaiver) {
    return { error: "יש לאשר את שני התנאים ולחתום על ההצהרה כדי להמשיך" };
  }

  let redirectUrl: string;
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc("get_booking_by_token", {
      p_access_token: token,
    });
    if (error) throw new Error(error.message);
    const booking = (data as unknown as TokenBooking[])?.[0];
    if (!booking || booking.id !== bookingId) {
      return { error: "לא נמצאה הזמנה מתאימה לקישור" };
    }
    if (booking.status !== "held") {
      return { error: "ההזמנה כבר שולמה או שאינה זמינה לתשלום" };
    }

    // Record the mandatory consents on the held booking (token-guarded), then charge in full.
    const { error: consentError } = await supabase.rpc("sign_booking_consents", {
      p_booking_id: bookingId,
      p_access_token: token,
      p_accept_policy: acceptedPolicy,
      p_sign_waiver: signedWaiver,
      p_marketing_opt_in: marketingOptIn,
    });
    if (consentError) throw new Error(consentError.message);

    const base = getSiteUrl();
    const provider = getPaymentProvider();
    const session = await provider.createCheckout({
      bookingId: booking.id,
      amount: Number(booking.deposit_amount),
      customerName: booking.registrant_name,
      customerEmail: booking.email,
      description: `השתתפות בטיול ${booking.trail_name}`,
      successUrl: `${base}/checkout/success?token=${token}`,
      failedUrl: `${base}/checkout/failed?token=${token}`,
      webhookUrl: `${base}/api/cardcom/webhook`,
    });

    const { error: attachError } = await supabase.rpc("attach_payment_session", {
      p_booking_id: booking.id,
      p_access_token: token,
      p_session_id: session.sessionId,
    });
    if (attachError) throw new Error(attachError.message);

    redirectUrl = session.redirectUrl;
  } catch {
    return { error: "אירעה תקלה בהפעלת התשלום. נסו שוב או צרו קשר." };
  }

  // Redirect must live outside the try/catch (it throws NEXT_REDIRECT by design).
  redirect(redirectUrl);
}

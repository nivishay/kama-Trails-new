"use server";

import { headers } from "next/headers";
import { getMessagingProvider } from "@/lib/messaging";
import { normalizeIsraeliMobile } from "@/lib/leads/phone";
import { checkContactRateLimit } from "@/lib/security/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Result surfaced back to the contact form via useActionState. */
export type ContactFormState = { ok?: boolean; error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ContactInput {
  name: string;
  phone: string;
  email: string;
  message: string;
  turnstileToken: string | null;
}

/** Parse + validate the contact form; throws a Hebrew message on invalid input. */
function parseContactForm(formData: FormData): ContactInput {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  // The whole funnel runs on WhatsApp, so contacting on WhatsApp is an explicit opt-in (#50).
  const consent = formData.get("consent_whatsapp") === "on";
  const turnstileToken =
    (formData.get("cf-turnstile-response") as string | null) || null;

  if (!name) throw new Error("יש להזין שם מלא");
  if (!phone) throw new Error("יש להזין מספר טלפון");
  if (!EMAIL_RE.test(email)) throw new Error("כתובת אימייל לא תקינה");
  if (!consent) throw new Error("יש לאשר יצירת קשר בוואטסאפ כדי לשלוח");

  return { name, phone, email, message, turnstileToken };
}

export async function submitContactForm(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  // Honeypot: a hidden field bots fill and humans never see. Look successful, drop silently (#51).
  if (String(formData.get("company") ?? "").trim() !== "") {
    return { ok: true };
  }

  let input: ContactInput;
  try {
    input = parseContactForm(formData);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Gate before spending any DB/WhatsApp work: rate-limit, then the bot check (#51).
  if (!(await checkContactRateLimit(ip))) {
    return { error: "נשלחו יותר מדי בקשות. נסו שוב מאוחר יותר." };
  }
  if (!(await verifyTurnstile(input.turnstileToken, ip))) {
    return { error: "אימות אנושי נכשל. רעננו את הדף ונסו שוב." };
  }

  // A valid Israeli mobile is normalized to E.164; junk numbers are still captured
  // (capture-always) but won't trigger a paid WhatsApp send (#50/#51).
  const mobile = normalizeIsraeliMobile(input.phone);
  const storedPhone = mobile?.e164 ?? input.phone;

  // 1. Capture the lead — the source of truth. This must succeed for the submit to count.
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("submit_lead", {
      p_name: input.name,
      p_email: input.email,
      p_phone: storedPhone,
      p_message: input.message,
    });
    if (error) throw new Error(error.message);
  } catch (error) {
    console.error("submitContactForm: submit_lead failed:", error);
    return { error: "אירעה תקלה בשליחת הפנייה. נסו שוב או צרו קשר טלפוני." };
  }

  // 2. Best-effort WhatsApp auto-reply — only for a valid mobile, and never breaks capture:
  // the lead is already stored, so a failed/skipped send is logged, not surfaced (#50).
  if (mobile) {
    try {
      const result = await getMessagingProvider().sendLeadAutoReply({
        toPhoneE164: mobile.e164,
        customerName: input.name,
      });
      if (result.status === "failed") {
        console.error("submitContactForm: auto-reply failed:", result.error);
      }
    } catch (error) {
      console.error("submitContactForm: auto-reply threw:", error);
    }
  }

  return { ok: true };
}

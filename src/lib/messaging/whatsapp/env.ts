// Server-only WhatsApp Cloud API credentials. These MUST NOT be prefixed with NEXT_PUBLIC —
// they must never reach the browser bundle. The permanent production token must be a business-
// owned System-User token (not a personal one that expires) — see docs/pre-launch-checklist.md.

export interface WhatsAppEnv {
  accessToken: string;
  phoneNumberId: string;
  templateName: string;
  templateLanguage: string;
  apiVersion: string;
}

const DEFAULT_TEMPLATE_NAME = "lead_auto_reply";
const DEFAULT_TEMPLATE_LANGUAGE = "he";
const DEFAULT_API_VERSION = "v21.0";

/**
 * Read the WhatsApp Cloud API config. Returns null when credentials are absent (local dev, or
 * before the token is provisioned) so the factory can fall back to a no-op provider and the lead
 * flow keeps working — capture never depends on the send (#50).
 */
export function readWhatsAppEnv(): WhatsAppEnv | null {
  if (typeof window !== "undefined") {
    throw new Error("WhatsApp credentials must never be read in the browser.");
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) return null;

  return {
    accessToken,
    phoneNumberId,
    templateName:
      process.env.WHATSAPP_LEAD_TEMPLATE_NAME ?? DEFAULT_TEMPLATE_NAME,
    templateLanguage:
      process.env.WHATSAPP_LEAD_TEMPLATE_LANG ?? DEFAULT_TEMPLATE_LANGUAGE,
    apiVersion: process.env.WHATSAPP_API_VERSION ?? DEFAULT_API_VERSION,
  };
}

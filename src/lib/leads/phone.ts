// The `/max` metadata bundle is required for accurate getType() — the default "min" bundle can't
// distinguish MOBILE from FIXED_LINE, which is exactly the distinction the send guard needs.
import { parsePhoneNumberFromString } from "libphonenumber-js/max";

export interface NormalizedMobile {
  /** E.164 digits without '+', e.g. "972501234567" — the storage + WhatsApp `to` form (#50). */
  e164: string;
}

/**
 * Parse a user-entered phone as an Israeli MOBILE and return its normalized E.164 (digits only),
 * or null if it is not a valid mobile. The auto-reply is a paid WhatsApp message and must only
 * fire at a real mobile — a landline or garbage number is captured as a lead but never messaged
 * (#51). Israeli mobile ranges (05x) are distinct from fixed lines, so libphonenumber classifies
 * them cleanly as MOBILE; anything else is rejected. Accepts local (`050-1234567`) and
 * international (`+972 50 123 4567`) input.
 */
export function normalizeIsraeliMobile(raw: string): NormalizedMobile | null {
  const parsed = parsePhoneNumberFromString(raw, "IL");
  if (!parsed || !parsed.isValid()) return null;
  if (parsed.getType() !== "MOBILE") return null;

  return { e164: parsed.number.replace(/^\+/, "") };
}

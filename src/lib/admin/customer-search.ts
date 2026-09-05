// Pure helpers for the Admin Customers view (#34): phone normalization, search-filter building
// and history rollup. Kept free of any I/O import so they are unit-testable in isolation
// (business logic must not depend on the Supabase client / env — CLAUDE.md layering).

/**
 * Normalize an Israeli phone to the E.164-digits match key, mirroring the DB's
 * normalize_phone_il so a phone search can hit the stored phone_key.
 */
export function normalizePhoneIl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("0") ? `972${digits.slice(1)}` : digits;
}

/**
 * Strip characters that carry meaning in a PostgREST `.or()` filter (commas, parentheses,
 * wildcards) so a search term can be embedded safely — prevents filter injection at this
 * boundary. Keeps letters (incl. Hebrew), digits, spaces and the email/phone punctuation.
 */
export function sanitizeSearchTerm(raw: string): string {
  return raw.replace(/[,()*%\\]/g, " ").trim();
}

/**
 * Build the PostgREST `.or()` expression that searches a customer by name, email or phone
 * (both the human-entered phone and the normalized key), or null when the term is empty.
 */
export function buildCustomerSearchOr(rawQuery: string): string | null {
  const term = sanitizeSearchTerm(rawQuery);
  if (!term) return null;

  const parts = [
    `full_name.ilike.%${term}%`,
    `email.ilike.%${term}%`,
    `phone.ilike.%${term}%`,
  ];
  const normalized = normalizePhoneIl(term);
  if (normalized) {
    parts.push(`phone_key.ilike.%${normalized}%`);
  }
  return parts.join(",");
}

/** Roll up per-customer booking/lead counts from flat rows keyed by customer_id. */
export function countHistoryByCustomer(
  bookings: { customer_id: string | null }[],
  leads: { customer_id: string | null }[],
): Map<string, { bookings: number; leads: number }> {
  const counts = new Map<string, { bookings: number; leads: number }>();
  const bump = (id: string | null, key: "bookings" | "leads") => {
    if (!id) return;
    const current = counts.get(id) ?? { bookings: 0, leads: 0 };
    current[key] += 1;
    counts.set(id, current);
  };
  for (const booking of bookings) bump(booking.customer_id, "bookings");
  for (const lead of leads) bump(lead.customer_id, "leads");
  return counts;
}

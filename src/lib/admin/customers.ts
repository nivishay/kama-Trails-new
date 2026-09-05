import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildCustomerSearchOr,
  countHistoryByCustomer,
} from "./customer-search";

// Admin Customers view (SBC) — the deduplicated Customer list with per-person history
// (DECISIONS #56, issue #34). Read-only slice: list + search by phone/email/name, and a
// per-customer detail aggregating their bookings, leads and marketing-consent state. Admin
// RLS gates every read (the customers table is admin-only).

export type MarketingConsentSource =
  | "checkout"
  | "lead_form"
  | "import"
  | "admin"
  | null;

/** A customer row in the list, with rollup counts of their history. */
export interface CustomerListItem {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  marketing_opt_in: boolean;
  needs_review: boolean;
  created_at: string;
  bookings_count: number;
  leads_count: number;
}

/** The full per-customer detail: contact + consent + their bookings and leads. */
export interface CustomerDetail {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  marketing_opt_in: boolean;
  marketing_consent_at: string | null;
  marketing_consent_source: MarketingConsentSource;
  needs_review: boolean;
  review_note: string | null;
  created_at: string;
  bookings: CustomerBooking[];
  leads: CustomerLead[];
}

export interface CustomerBooking {
  id: string;
  trail_name: string;
  trip_date: string | null;
  participants_count: number;
  total_amount: number;
  status: string;
  created_at: string;
}

export interface CustomerLead {
  id: string;
  message: string | null;
  status: string;
  created_at: string;
}

const CUSTOMER_LIST_COLUMNS =
  "id, full_name, phone, email, marketing_opt_in, needs_review, created_at";

/**
 * The deduplicated customer list, optionally filtered by a name/email/phone search. Customers
 * flagged for review (cross-match conflict) sort first so the admin sees them. History counts
 * are aggregated in memory (customer volumes are small, mirroring the bookings rollup).
 */
export async function listCustomers(
  search?: string,
): Promise<CustomerListItem[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase.from("customers").select(CUSTOMER_LIST_COLUMNS);
  const orFilter = search ? buildCustomerSearchOr(search) : null;
  if (orFilter) {
    query = query.or(orFilter);
  }
  const { data, error } = await query
    .order("needs_review", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load customers: ${error.message}`);
  }
  const customers = (data ?? []) as unknown as Omit<
    CustomerListItem,
    "bookings_count" | "leads_count"
  >[];
  if (customers.length === 0) return [];

  const ids = customers.map((customer) => customer.id);
  const [bookings, leads] = await Promise.all([
    supabase.from("bookings").select("customer_id").in("customer_id", ids),
    supabase.from("leads").select("customer_id").in("customer_id", ids),
  ]);
  if (bookings.error) {
    throw new Error(`Failed to load customer bookings: ${bookings.error.message}`);
  }
  if (leads.error) {
    throw new Error(`Failed to load customer leads: ${leads.error.message}`);
  }

  const counts = countHistoryByCustomer(
    (bookings.data ?? []) as { customer_id: string | null }[],
    (leads.data ?? []) as { customer_id: string | null }[],
  );

  return customers.map((customer) => {
    const rollup = counts.get(customer.id) ?? { bookings: 0, leads: 0 };
    return {
      ...customer,
      bookings_count: rollup.bookings,
      leads_count: rollup.leads,
    };
  });
}

/** One customer with their full bookings + leads history, or null if not found. */
export async function getCustomerDetail(
  id: string,
): Promise<CustomerDetail | null> {
  const supabase = await createSupabaseServerClient();

  const { data: customer, error } = await supabase
    .from("customers")
    .select(
      "id, full_name, phone, email, marketing_opt_in, marketing_consent_at, " +
        "marketing_consent_source, needs_review, review_note, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load customer ${id}: ${error.message}`);
  }
  if (!customer) return null;

  const [bookings, leads] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, trail_name, trip_date, participants_count, total_amount, status, created_at",
      )
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("leads")
      .select("id, message, status, created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (bookings.error) {
    throw new Error(`Failed to load bookings: ${bookings.error.message}`);
  }
  if (leads.error) {
    throw new Error(`Failed to load leads: ${leads.error.message}`);
  }

  return {
    ...(customer as unknown as Omit<CustomerDetail, "bookings" | "leads">),
    bookings: (bookings.data ?? []) as unknown as CustomerBooking[],
    leads: (leads.data ?? []) as unknown as CustomerLead[],
  };
}

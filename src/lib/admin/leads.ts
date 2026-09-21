import { createSupabaseServerClient } from "@/lib/supabase/server";

// Reads for the leads inbox (פניות) — contact-form submissions (DECISIONS #10). Admin-only (RLS).

export type LeadStatus = "new" | "contacted" | "closed";

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: LeadStatus;
  created_at: string;
}

const LEAD_COLUMNS = "id, name, email, phone, message, status, created_at";

/** All leads, newest first. */
export async function getLeads(): Promise<Lead[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load leads: ${error.message}`);
  }
  return (data ?? []) as unknown as Lead[];
}

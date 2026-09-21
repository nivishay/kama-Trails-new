"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LeadStatus } from "@/lib/admin/leads";

const LEADS_PATH = "/admin/leads";
const STATUSES: LeadStatus[] = ["new", "contacted", "closed"];

/** Move a lead along its lifecycle (new → contacted → closed). Admin-only via RLS. */
export async function setLeadStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as LeadStatus;
  if (!id || !STATUSES.includes(status)) return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", id);
  if (error) {
    throw new Error(`עדכון סטטוס הפנייה נכשל: ${error.message}`);
  }

  revalidatePath(LEADS_PATH);
}

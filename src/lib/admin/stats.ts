import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Headline counts for the dashboard home tiles. */
export interface AdminStats {
  upcomingDepartures: number;
  confirmedBookings: number;
  confirmedParticipants: number;
  newLeads: number;
}

/** Local calendar date as "YYYY-MM-DD" (matches the DB's date-only columns). */
function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createSupabaseServerClient();
  const today = todayIso();

  const [upcoming, confirmed, participantRows, leads] = await Promise.all([
    supabase
      .from("departures")
      .select("*", { count: "exact", head: true })
      .gte("date", today)
      .eq("status", "open"),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "confirmed"),
    supabase
      .from("bookings")
      .select("participants_count")
      .eq("status", "confirmed"),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "new"),
  ]);

  const firstError =
    upcoming.error ?? confirmed.error ?? participantRows.error ?? leads.error;
  if (firstError) {
    throw new Error(`Failed to load stats: ${firstError.message}`);
  }

  const confirmedParticipants = (
    (participantRows.data ?? []) as { participants_count: number }[]
  ).reduce((sum, row) => sum + row.participants_count, 0);

  return {
    upcomingDepartures: upcoming.count ?? 0,
    confirmedBookings: confirmed.count ?? 0,
    confirmedParticipants,
    newLeads: leads.count ?? 0,
  };
}

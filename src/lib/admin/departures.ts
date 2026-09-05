import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DepartureStatus } from "@/lib/catalog/types";

/**
 * A departure as the admin sees it: raw stored status (drives the open/close toggle) plus the
 * effective public deadline and a `public_closed` flag (still `open` but past the deadline —
 * closed to the public, #53) and the `is_private` unlisted flag (#32). From list_departures_admin.
 */
export interface AdminDeparture {
  id: string;
  trail_id: string;
  trail_name: string;
  date: string;
  departure_time: string | null;
  price: number;
  min_capacity: number;
  max_capacity: number;
  status: DepartureStatus;
  free_spots: number;
  registration_closes_at: string | null;
  effective_close: string;
  public_closed: boolean;
  is_private: boolean;
}

/** A trail choice for the departure form's trail picker. */
export interface TrailOption {
  id: string;
  name: string;
}

/** The editable fields of a single departure (raw row, no availability). */
export interface DepartureRecord {
  id: string;
  trail_id: string;
  date: string;
  departure_time: string | null;
  price: number;
  min_capacity: number;
  max_capacity: number;
  status: DepartureStatus;
  registration_closes_at: string | null;
  is_private: boolean;
}

const DEPARTURE_COLUMNS =
  "id, trail_id, date, departure_time, price, min_capacity, max_capacity, status, " +
  "registration_closes_at, is_private";

/**
 * Every departure (all trails, including private) with DB-computed `free_spots`, effective
 * public deadline and trail name, ordered by date ascending. Reads through the admin-only
 * `list_departures_admin` RPC (is_admin-guarded) so the admin sees the true stored status.
 */
export async function getAdminDepartures(): Promise<AdminDeparture[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_departures_admin");

  if (error) {
    throw new Error(`Failed to load departures: ${error.message}`);
  }
  return (data ?? []) as unknown as AdminDeparture[];
}

/** Trails for the form's picker, ordered for display. */
export async function getTrailOptions(): Promise<TrailOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trails")
    .select("id, name")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load trails: ${error.message}`);
  }
  return (data ?? []) as TrailOption[];
}

/** One departure by id for the edit form, or null if it does not exist. */
export async function getDepartureById(
  id: string,
): Promise<DepartureRecord | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("departures")
    .select(DEPARTURE_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load departure ${id}: ${error.message}`);
  }
  return (data as unknown as DepartureRecord | null) ?? null;
}

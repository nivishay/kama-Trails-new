import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  DepartureAvailability,
  DepartureStatus,
} from "@/lib/catalog/types";

/** A departure plus its trail name, for the admin list. */
export interface AdminDeparture extends DepartureAvailability {
  trail_name: string;
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
}

const DEPARTURE_COLUMNS =
  "id, trail_id, date, departure_time, price, min_capacity, max_capacity, status";

/**
 * Every departure (all trails) with DB-computed `free_spots`, annotated with its
 * trail name and ordered by date ascending. Reads through the authenticated
 * server client so RLS applies (admin session).
 */
export async function getAdminDepartures(): Promise<AdminDeparture[]> {
  const supabase = await createSupabaseServerClient();

  const [availability, trails] = await Promise.all([
    supabase.rpc("list_availability", { p_trail_id: null }),
    supabase.from("trails").select("id, name"),
  ]);

  if (availability.error) {
    throw new Error(`Failed to load departures: ${availability.error.message}`);
  }
  if (trails.error) {
    throw new Error(`Failed to load trails: ${trails.error.message}`);
  }

  const nameById = new Map(
    ((trails.data ?? []) as { id: string; name: string }[]).map((trail) => [
      trail.id,
      trail.name,
    ]),
  );

  return ((availability.data ?? []) as unknown as DepartureAvailability[]).map(
    (departure) => ({
      ...departure,
      trail_name: nameById.get(departure.trail_id) ?? "—",
    }),
  );
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

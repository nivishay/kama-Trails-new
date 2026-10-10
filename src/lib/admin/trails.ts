import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Difficulty, Region, Trail } from "@/lib/catalog/types";

/** A trail row as the admin list table shows it (lightweight, no long copy). */
export interface AdminTrailListItem {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  region: Region;
  difficulty: Difficulty | null;
  price: number;
  sort_order: number;
}

/** Full column set for the edit form — matches the Trail domain type. */
const TRAIL_COLUMNS =
  "id, slug, name, short_name, region, region_label, difficulty, difficulty_label, " +
  "price, height, duration, hero_image, gallery, excerpt, description, gear, " +
  "audience, included, sort_order";

/** Every trail for the admin list, ordered the way the public catalog shows them. */
export async function getAdminTrails(): Promise<AdminTrailListItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trails")
    .select("id, slug, name, short_name, region, difficulty, price, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load trails: ${error.message}`);
  }
  return (data ?? []) as unknown as AdminTrailListItem[];
}

/** One trail by id for the edit form, or null if it does not exist. */
export async function getTrailById(id: string): Promise<Trail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trails")
    .select(TRAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load trail ${id}: ${error.message}`);
  }
  return (data as unknown as Trail | null) ?? null;
}

/**
 * How many bookings reference this trail. A trail with bookings must not be
 * deleted: its departures are FK-protected (bookings → departures ON DELETE
 * RESTRICT), so the delete would fail at the DB. We check first to give the
 * admin a clear message instead of a raw constraint error.
 */
export async function countTrailBookings(trailId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("trail_id", trailId);

  if (error) {
    throw new Error(
      `Failed to count bookings for trail ${trailId}: ${error.message}`,
    );
  }
  return count ?? 0;
}

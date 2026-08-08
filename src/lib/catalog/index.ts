import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DepartureAvailability, Region, Trail } from "./types";

// supabase-js can't infer row types from a runtime column string (we don't
// generate DB types), so query results are cast through `unknown` to our
// hand-maintained domain types (kept in sync with docs/SCHEMA.md).

/** Columns selected for a trail — explicit so the shape matches the Trail type. */
const TRAIL_COLUMNS =
  "id, slug, name, short_name, region, region_label, difficulty, difficulty_label, " +
  "price, height, duration, hero_image, gallery, excerpt, description, gear, " +
  "audience, included, sort_order";

/** Fetch all trails, optionally filtered by region, ordered for display. */
export async function getTrails(region?: Region): Promise<Trail[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("trails")
    .select(TRAIL_COLUMNS)
    .order("sort_order", { ascending: true });

  if (region) {
    query = query.eq("region", region);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load trails: ${error.message}`);
  }
  return (data ?? []) as unknown as Trail[];
}

/** Fetch a single trail by its slug, or null if not found. */
export async function getTrailBySlug(slug: string): Promise<Trail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trails")
    .select(TRAIL_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load trail "${slug}": ${error.message}`);
  }
  return (data as unknown as Trail | null) ?? null;
}

/**
 * Fetch departures via the `list_availability` RPC so `free_spots` is computed
 * in the DB (capacity-correct, seat-hold aware). Ordered by date asc. Pass a
 * trailId to scope to one trail, or omit for every trail's departures.
 */
export async function getDeparturesForTrail(
  trailId?: string,
): Promise<DepartureAvailability[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_availability", {
    p_trail_id: trailId ?? null,
  });

  if (error) {
    const scope = trailId ? `trail ${trailId}` : "all trails";
    throw new Error(`Failed to load departures for ${scope}: ${error.message}`);
  }
  return (data ?? []) as unknown as DepartureAvailability[];
}

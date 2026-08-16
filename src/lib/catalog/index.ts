import { createSupabasePublicClient } from "@/lib/supabase/public";
import { withResolvedPhotos } from "./photos";
import type {
  DepartureAvailability,
  DepartureStatus,
  Region,
  Trail,
} from "./types";

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
  const supabase = createSupabasePublicClient();
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
  return ((data ?? []) as unknown as Trail[]).map(withResolvedPhotos);
}

/** Fetch a single trail by its slug, or null if not found. */
export async function getTrailBySlug(slug: string): Promise<Trail | null> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("trails")
    .select(TRAIL_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load trail "${slug}": ${error.message}`);
  }
  const trail = (data as unknown as Trail | null) ?? null;
  return trail ? withResolvedPhotos(trail) : null;
}

/** A single departure with the trail context the checkout page needs to show. */
export interface CheckoutDeparture {
  id: string;
  trail_id: string;
  trail_name: string;
  trail_slug: string;
  date: string;
  departure_time: string | null;
  price: number;
  status: DepartureStatus;
  free_spots: number;
}

/**
 * Fetch one departure (+ trail name and DB-computed free_spots) for the checkout page,
 * or null if it does not exist. Read-only public data via the anon client.
 */
export async function getDepartureForCheckout(
  departureId: string,
): Promise<CheckoutDeparture | null> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("departures")
    .select(
      "id, trail_id, date, departure_time, price, status, trails(name, slug)",
    )
    .eq("id", departureId)
    .maybeSingle();
  if (error) {
    throw new Error(
      `Failed to load departure ${departureId}: ${error.message}`,
    );
  }
  if (!data) return null;

  const { data: freeSpots, error: freeError } = await supabase.rpc(
    "free_spots",
    {
      p_departure_id: departureId,
    },
  );
  if (freeError) {
    throw new Error(
      `Failed to load free spots for departure ${departureId}: ${freeError.message}`,
    );
  }

  const row = data as unknown as {
    id: string;
    trail_id: string;
    date: string;
    departure_time: string | null;
    price: number;
    status: DepartureStatus;
    trails: { name: string; slug: string } | null;
  };
  return {
    id: row.id,
    trail_id: row.trail_id,
    trail_name: row.trails?.name ?? "",
    trail_slug: row.trails?.slug ?? "",
    date: row.date,
    departure_time: row.departure_time,
    price: row.price,
    status: row.status,
    free_spots: Number(freeSpots ?? 0),
  };
}

/**
 * Fetch departures via the `list_availability` RPC so `free_spots` is computed
 * in the DB (capacity-correct, seat-hold aware). Ordered by date asc. Pass a
 * trailId to scope to one trail, or omit for every trail's departures.
 */
export async function getDeparturesForTrail(
  trailId?: string,
): Promise<DepartureAvailability[]> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.rpc("list_availability", {
    p_trail_id: trailId ?? null,
  });

  if (error) {
    const scope = trailId ? `trail ${trailId}` : "all trails";
    throw new Error(`Failed to load departures for ${scope}: ${error.message}`);
  }
  return (data ?? []) as unknown as DepartureAvailability[];
}

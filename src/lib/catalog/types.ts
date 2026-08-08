/** Domain types for the public catalog. Mirror docs/SCHEMA.md (trails, departures). */

export type Region = "north" | "south" | "center";

export type Difficulty =
  "easy" | "easy-medium" | "medium" | "medium-hard" | "hard";

export type DepartureStatus = "open" | "closed" | "cancelled";

/** A reusable route offered by the company (trails table). */
export interface Trail {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  region: Region;
  region_label: string | null;
  difficulty: Difficulty | null;
  difficulty_label: string | null;
  price: number;
  height: string | null;
  duration: string | null;
  hero_image: string | null;
  gallery: string[];
  excerpt: string | null;
  description: string | null;
  gear: string | null;
  audience: string | null;
  included: string | null;
  sort_order: number;
}

/**
 * A dated bookable instance of a trail, as returned by the `list_availability`
 * RPC — includes DB-computed `free_spots` (capacity minus confirmed + held).
 */
export interface DepartureAvailability {
  id: string;
  trail_id: string;
  date: string; // ISO date (YYYY-MM-DD)
  departure_time: string | null;
  price: number;
  min_capacity: number;
  max_capacity: number;
  status: DepartureStatus;
  free_spots: number;
}

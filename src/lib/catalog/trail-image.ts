// Trail images are stored as RELATIVE paths inside the public `trip_photos`
// Supabase Storage bucket (e.g. "nahal-gilabon/hero.jpg"), which keeps the data
// portable across environments (prod / preview / local each build their own URL).
// This turns a stored reference into a URL `next/image` can actually load.

const TRIP_PHOTOS_BUCKET = "trip_photos";

/**
 * Resolve a stored trail image reference to a loadable public URL.
 *
 * - `null` / empty            → `null` (callers render the placeholder)
 * - already-absolute (`http`) → returned unchanged (e.g. legacy base44 media)
 * - relative storage path     → public URL in THIS environment's bucket, built
 *   from `NEXT_PUBLIC_SUPABASE_URL` so each deployment serves its own files.
 *
 * Reads `process.env.NEXT_PUBLIC_SUPABASE_URL` directly (not via the throwing
 * env module) so rendering a card in a unit test without Supabase env degrades
 * to the placeholder instead of crashing the render.
 */
export function trailImageUrl(ref: string | null | undefined): string | null {
  if (!ref) return null;
  const trimmed = ref.trim();
  if (trimmed === "") return null;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  const base = supabaseUrl.replace(/\/+$/, "");
  const path = trimmed.replace(/^\/+/, "");
  return `${base}/storage/v1/object/public/${TRIP_PHOTOS_BUCKET}/${path}`;
}

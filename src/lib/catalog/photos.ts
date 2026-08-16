import { SUPABASE_URL } from "@/lib/supabase/env";
import type { Trail } from "./types";

/** Public Storage bucket holding per-trail photos (see issue #19 layout). */
const TRIP_PHOTOS_BUCKET = "trip_photos";

const PUBLIC_OBJECT_BASE = `${SUPABASE_URL}/storage/v1/object/public/${TRIP_PHOTOS_BUCKET}`;

/**
 * Turn a stored trail photo reference into a browser-loadable URL.
 *
 * Photos live in the public `trip_photos` bucket and are stored in the DB as
 * bucket-relative keys (e.g. `dalton-cliff/d1.jpg`). Legacy seed rows instead
 * hold absolute URLs (base44 media); those pass through untouched so both
 * sources render from the same `<Image src>`.
 */
export function resolveTrailPhotoUrl(reference: string): string {
  if (/^https?:\/\//i.test(reference)) {
    return reference;
  }
  const encodedPath = reference
    .replace(/^\/+/, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return `${PUBLIC_OBJECT_BASE}/${encodedPath}`;
}

/**
 * Return a copy of the trail with `hero_image` and every `gallery` entry
 * resolved to loadable URLs. Applied at the catalog read boundary so pages and
 * components can render photos directly without knowing about Storage.
 */
export function withResolvedPhotos(trail: Trail): Trail {
  return {
    ...trail,
    hero_image: trail.hero_image
      ? resolveTrailPhotoUrl(trail.hero_image)
      : null,
    gallery: trail.gallery.map(resolveTrailPhotoUrl),
  };
}

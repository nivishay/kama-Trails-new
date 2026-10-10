// Pure helpers for the admin trail image uploader. Kept framework-free so the
// path/validation rules are unit-tested in isolation; the actual Storage upload
// I/O lives in the client component that imports these.

/** Public Supabase Storage bucket holding every trail photo (and site media). */
export const TRIP_PHOTOS_BUCKET = "trip_photos";

/** Images we accept for trail hero/gallery uploads (matches next/image loaders). */
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

/** Upper bound on a single upload. Trail photos are web-sized, not originals. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

/**
 * Reject a file that is the wrong type or too large, returning a Hebrew message
 * for the UI, or `null` when the file is acceptable.
 */
export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return "סוג קובץ לא נתמך. יש להעלות תמונה (JPG, PNG, WEBP, GIF או AVIF).";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "הקובץ גדול מדי. הגודל המרבי הוא 10MB.";
  }
  return null;
}

/** Storage-safe extension (incl. dot) for a MIME type, defaulting to `.jpg`. */
export function imageExtensionForType(type: string): string {
  return EXTENSION_BY_TYPE[type] ?? ".jpg";
}

/**
 * Relative object path for a trail image: `<slug>/<uniqueId><ext>`. The slug
 * folder keeps each trail's media together (matches the existing bucket layout);
 * the caller-supplied `uniqueId` (e.g. crypto.randomUUID()) avoids collisions and
 * keeps keys ASCII regardless of the original Hebrew file name.
 */
export function tripPhotoObjectPath(
  slug: string,
  mimeType: string,
  uniqueId: string,
): string {
  return `${slug}/${uniqueId}${imageExtensionForType(mimeType)}`;
}

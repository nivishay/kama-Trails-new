import { DIFFICULTIES } from "@/lib/catalog/difficulty";
import type { Difficulty, Region } from "@/lib/catalog/types";

/** Every region, in the catalog's display order (admin select + validation). */
export const REGIONS: Region[] = ["north", "south", "center"];

// Lowercase ASCII slug: letters/digits in hyphen-separated groups (no leading/
// trailing/double hyphens). Keeps trail URLs clean and the old→new redirect map
// predictable (see CLAUDE.md SEO north star).
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The writable fields of a trail, parsed and validated from the admin form. */
export interface TrailInput {
  slug: string;
  name: string;
  short_name: string;
  region: Region;
  region_label: string | null;
  difficulty: Difficulty | null;
  difficulty_label: string | null;
  price: number;
  height: string | null;
  duration: string | null;
  hero_image: string | null;
  excerpt: string | null;
  description: string | null;
  gear: string | null;
  audience: string | null;
  included: string | null;
  sort_order: number;
  gallery: string[];
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Trimmed field value, or null when empty — matches the DB's nullable columns. */
function optionalText(formData: FormData, key: string): string | null {
  return text(formData, key) || null;
}

/** Split a gallery textarea (one storage path per line) into a clean path list. */
export function parseGallery(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Parse + validate the trail form. Throws a Hebrew message on invalid input so
 * the server action can surface it. Mirrors the DB's NOT NULL / CHECK columns
 * (slug, name, short_name, region, price are required; difficulty is optional).
 */
export function parseTrailForm(formData: FormData): TrailInput {
  const slug = text(formData, "slug");
  const name = text(formData, "name");
  const shortName = text(formData, "short_name");
  const region = text(formData, "region") as Region;
  const difficultyRaw = text(formData, "difficulty");
  const price = Number(formData.get("price"));
  const sortOrderRaw = text(formData, "sort_order");
  const sortOrder = sortOrderRaw === "" ? 0 : Number(sortOrderRaw);

  if (!slug) throw new Error("יש להזין מזהה (slug)");
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error("המזהה יכול לכלול רק אותיות לטיניות קטנות, ספרות ומקפים");
  }
  if (!name) throw new Error("יש להזין שם מסלול");
  if (!shortName) throw new Error("יש להזין שם קצר");
  if (!REGIONS.includes(region)) throw new Error("יש לבחור אזור");
  if (difficultyRaw && !DIFFICULTIES.includes(difficultyRaw as Difficulty)) {
    throw new Error("רמת קושי לא תקינה");
  }
  if (!Number.isFinite(price) || price < 0) throw new Error("מחיר לא תקין");
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new Error("סדר התצוגה חייב להיות מספר אי-שלילי");
  }

  return {
    slug,
    name,
    short_name: shortName,
    region,
    region_label: optionalText(formData, "region_label"),
    difficulty: difficultyRaw ? (difficultyRaw as Difficulty) : null,
    difficulty_label: optionalText(formData, "difficulty_label"),
    price,
    height: optionalText(formData, "height"),
    duration: optionalText(formData, "duration"),
    hero_image: optionalText(formData, "hero_image"),
    excerpt: optionalText(formData, "excerpt"),
    description: optionalText(formData, "description"),
    gear: optionalText(formData, "gear"),
    audience: optionalText(formData, "audience"),
    included: optionalText(formData, "included"),
    sort_order: sortOrder,
    gallery: parseGallery(String(formData.get("gallery") ?? "")),
  };
}

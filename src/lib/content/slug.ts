/**
 * Slug generation for Articles (DECISIONS #49): an ASCII, URL-safe slug derived
 * from the (Hebrew) title. The slug is a suggestion the admin can edit while the
 * article is a draft, then it freezes at first publish. The Hebrew keyword still
 * lives in the title/H1/meta, where search engines weigh it most; the slug is
 * ASCII for convention (matches Trail slugs) and copy-paste cleanliness.
 */

/** Standard Hebrew-letter → Latin transliteration (final forms included). */
const HEBREW_TO_LATIN: Record<string, string> = {
  א: "a",
  ב: "b",
  ג: "g",
  ד: "d",
  ה: "h",
  ו: "v",
  ז: "z",
  ח: "ch",
  ט: "t",
  י: "y",
  כ: "k",
  ך: "k",
  ל: "l",
  מ: "m",
  ם: "m",
  נ: "n",
  ן: "n",
  ס: "s",
  ע: "a",
  פ: "p",
  ף: "f",
  צ: "tz",
  ץ: "tz",
  ק: "k",
  ר: "r",
  ש: "sh",
  ת: "t",
};

const MAX_SLUG_LENGTH = 80;

/** Transliterate any Hebrew characters in a string to Latin; leave the rest. */
function transliterateHebrew(text: string): string {
  let result = "";
  for (const char of text) {
    result += HEBREW_TO_LATIN[char] ?? char;
  }
  return result;
}

/**
 * Turn a title into an ASCII slug: transliterate Hebrew, lowercase, and collapse
 * any run of non-alphanumeric characters into single hyphens. Returns "" when the
 * title has no usable characters (caller falls back to a generated slug).
 */
export function slugify(title: string): string {
  return transliterateHebrew(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
}

/**
 * Validate an admin-supplied slug: lowercase ASCII letters/digits separated by
 * single hyphens, no leading/trailing hyphen. Keeps URLs clean and predictable.
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

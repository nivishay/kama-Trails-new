import sanitizeHtml from "sanitize-html";

/**
 * The one hard security boundary of the Articles feature (DECISIONS #52, ADR 0003).
 *
 * The admin authors article bodies in a rich-text editor, which produces HTML.
 * Storing author HTML and rendering it raw is the classic stored-XSS vector, so we
 * sanitize on the WRITE path against a strict allow-list: only the formatting tags
 * an article needs survive; scripts, event handlers, styles, iframes, and unknown
 * schemes are stripped. What is stored can therefore only ever be safe markup.
 *
 * Widening this allow-list (e.g. tables, video embeds) is a deliberate, tested
 * change to this one place — never scattered around the app.
 */

/** Tags an SEO article legitimately needs — nothing that can execute or embed. */
const ALLOWED_TAGS = [
  "h2",
  "h3",
  "p",
  "strong",
  "em",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "blockquote",
  "br",
];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt"],
  },
  // Links and image sources may only use safe schemes (no javascript:, no data:).
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https"] },
  // Relative URLs (our own /trails/... links) are fine.
  allowProtocolRelative: false,
  // Drop the content of script/style entirely, not just the tags.
  disallowedTagsMode: "discard",
  transformTags: {
    // Force safe rel on every link so target=_blank can't reach window.opener.
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
  },
};

/** Sanitize author-supplied HTML down to the article allow-list. */
export function sanitizeArticleHtml(dirtyHtml: string): string {
  return sanitizeHtml(dirtyHtml, SANITIZE_OPTIONS);
}

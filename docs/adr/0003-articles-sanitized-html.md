# ADR 0003 — Articles authored in a WYSIWYG editor, stored as sanitized HTML

Status: Accepted (2026-08-15)

## Context
Stav wants a public Articles section (nav מאמרים) he can write into himself, as SEO
content-marketing (DECISIONS #46). The author is non-technical; the content needs real
structure for SEO — headings (h2/h3), paragraphs, bold, hyperlinks (incl. to Trails),
lists, and images placed between paragraphs. We had to decide (a) how Stav writes the
body and (b) what we persist for it.

## Decision
Author the body in a **WYSIWYG rich-text editor** (TipTap) and persist it as **sanitized
HTML** in `articles.body_html`. The HTML is sanitized **server-side on save** against a
strict allow-list — tags `h2 h3 p strong em u ul ol li a[href] img[src alt] blockquote br`,
all event handlers stripped, and `href`/`src` restricted to `https:`/relative (no
`javascript:` etc.). The public page server-renders that column via
`dangerouslySetInnerHTML` (optionally re-sanitized on render as defense-in-depth). XSS
payloads are covered by unit tests on the sanitizer.

## Why (the trade-off)
- **WYSIWYG over textarea/markdown** — a plain textarea can't produce the headings/links/
  inline images SEO articles need; markdown asks a non-technical owner to learn syntax
  (worse in RTL Hebrew). A WYSIWYG lets Stav produce well-structured content with no syntax.
- **Sanitized HTML over editor JSON** — HTML renders on the public page with **zero editor
  JS shipped to visitors** (fast, SEO-friendly server render) and is portable if we ever
  swap editors; JSON would couple stored content to TipTap forever.
- **Sanitize on save, server-side** — storing user-authored HTML and rendering it raw is
  the classic stored-XSS vector. Sanitizing at the write boundary (not trusting the editor,
  not relying on client code) means the database can only ever hold safe markup. This is the
  **one hard security boundary** of the feature; everything else is assembly of existing
  pieces (Storage upload, RLS admin CRUD).

## Alternatives considered
- **Plain textarea (plain text)** — simplest, but structurally can't meet SEO article needs.
- **Markdown** — a non-technical author won't reliably write it; RTL editing is awkward.
- **Store TipTap JSON, render on client** — ships editor code to every visitor, hurts
  server-render/SEO, and locks content to one editor.
- **Store raw HTML, sanitize only on render** — one forgotten render path = stored XSS; the
  DB would hold unsafe data. Rejected in favor of sanitizing at the write boundary.

## Consequences
- One editor dependency (TipTap, with deliberate RTL config) and one sanitizer with a
  maintained allow-list + XSS regression tests.
- Inline images upload to a dedicated public-read `article_images` Storage bucket
  (admin-write), reusing existing upload machinery.
- Widening the allow-list later (e.g. tables, embeds) is a deliberate, tested change to one
  place — not scattered across the app.

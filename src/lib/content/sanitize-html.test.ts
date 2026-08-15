import { describe, expect, it } from "vitest";
import { sanitizeArticleHtml } from "./sanitize-html";

describe("sanitizeArticleHtml — keeps legitimate article markup", () => {
  it("preserves allow-listed formatting tags", () => {
    const input =
      "<h2>כותרת</h2><p>פסקה עם <strong>הדגשה</strong> ו<em>נטייה</em></p><ul><li>פריט</li></ul>";
    expect(sanitizeArticleHtml(input)).toBe(input);
  });

  it("keeps a safe link and adds a protective rel", () => {
    const out = sanitizeArticleHtml('<a href="/trails/dalton">מסלול דלתון</a>');
    expect(out).toContain('href="/trails/dalton"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it("keeps an https image with alt text", () => {
    const out = sanitizeArticleHtml(
      '<img src="https://example.com/a.jpg" alt="נוף" />',
    );
    expect(out).toContain('src="https://example.com/a.jpg"');
    expect(out).toContain('alt="נוף"');
  });
});

describe("sanitizeArticleHtml — strips XSS vectors", () => {
  it("removes script tags and their contents", () => {
    const out = sanitizeArticleHtml('<p>hi</p><script>alert("xss")</script>');
    expect(out).toBe("<p>hi</p>");
    expect(out).not.toContain("alert");
  });

  it("strips inline event handlers", () => {
    const out = sanitizeArticleHtml('<p onclick="steal()">text</p>');
    expect(out).toBe("<p>text</p>");
    expect(out).not.toContain("onclick");
  });

  it("drops javascript: URLs on links", () => {
    // eslint-disable-next-line no-script-url
    const out = sanitizeArticleHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain("javascript:");
  });

  it("drops data: image sources (only http/https allowed)", () => {
    const out = sanitizeArticleHtml(
      '<img src="data:text/html;base64,PHNjcmlwdD4=" alt="x" />',
    );
    expect(out).not.toContain("data:");
  });

  it("removes disallowed structural tags like iframe and style", () => {
    const out = sanitizeArticleHtml(
      '<iframe src="https://evil.test"></iframe><style>*{}</style><p>ok</p>',
    );
    expect(out).toBe("<p>ok</p>");
  });

  it("strips onerror from an image", () => {
    const out = sanitizeArticleHtml(
      '<img src="https://ok.test/a.jpg" onerror="alert(1)" alt="a" />',
    );
    expect(out).not.toContain("onerror");
    expect(out).toContain('src="https://ok.test/a.jpg"');
  });
});

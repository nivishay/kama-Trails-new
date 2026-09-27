import { describe, expect, it } from "vitest";
import { parseMarkdownBlocks } from "./markdown";

describe("parseMarkdownBlocks", () => {
  it("parses a `## ` line as a level-2 heading", () => {
    expect(parseMarkdownBlocks("## כותרת")).toEqual([
      { type: "heading", level: 2, text: "כותרת" },
    ]);
  });

  it("parses a `### ` line as a level-3 heading", () => {
    expect(parseMarkdownBlocks("### תת כותרת")).toEqual([
      { type: "heading", level: 3, text: "תת כותרת" },
    ]);
  });

  it("groups consecutive bullet lines into one unordered list", () => {
    const markdown = "- ראשון\n- שני\n- שלישי";
    expect(parseMarkdownBlocks(markdown)).toEqual([
      { type: "list", ordered: false, items: ["ראשון", "שני", "שלישי"] },
    ]);
  });

  it("groups consecutive numbered lines into one ordered list", () => {
    const markdown = "1. ראשון\n2. שני\n3. שלישי";
    expect(parseMarkdownBlocks(markdown)).toEqual([
      { type: "list", ordered: true, items: ["ראשון", "שני", "שלישי"] },
    ]);
  });

  it("splits into separate lists when the list style changes", () => {
    const markdown = "- תבליט\n1. ממוספר";
    expect(parseMarkdownBlocks(markdown)).toEqual([
      { type: "list", ordered: false, items: ["תבליט"] },
      { type: "list", ordered: true, items: ["ממוספר"] },
    ]);
  });

  it("ends a list at a blank line", () => {
    const markdown = "- פריט\n\nפסקה";
    expect(parseMarkdownBlocks(markdown)).toEqual([
      { type: "list", ordered: false, items: ["פריט"] },
      { type: "paragraph", text: "פסקה" },
    ]);
  });

  it("parses a plain line as a paragraph", () => {
    expect(parseMarkdownBlocks("סתם משפט")).toEqual([
      { type: "paragraph", text: "סתם משפט" },
    ]);
  });

  it("drops the `# ` title and the `מקור:` source line", () => {
    const markdown = "# כותרת ראשית\nמקור: https://example.com\nתוכן";
    expect(parseMarkdownBlocks(markdown)).toEqual([
      { type: "paragraph", text: "תוכן" },
    ]);
  });
});

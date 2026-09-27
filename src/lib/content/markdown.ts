export type MarkdownBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] };

const HEADING_3 = "### ";
const HEADING_2 = "## ";
const TITLE_PREFIX = "# ";
const SOURCE_PREFIX = "מקור:";
const UNORDERED_ITEM = /^[-*]\s+(.*)$/;
const ORDERED_ITEM = /^\d+\.\s+(.*)$/;

/** Minimal block parser for the legal docs: `##` / `###` headings, `- `/`* `
 *  bullet lists, `1.` ordered lists, and blank-line-separated paragraphs.
 *  The `# ` title and `מקור:` source lines are dropped (the title is shown in
 *  the PageHero). No inline markdown is interpreted. */
export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let listItems: string[] = [];
  let listOrdered = false;

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: "list", ordered: listOrdered, items: listItems });
      listItems = [];
    }
  };

  const pushItem = (text: string, ordered: boolean) => {
    // A change of list style closes the previous list and starts a new one.
    if (listItems.length > 0 && ordered !== listOrdered) {
      flushList();
    }
    listOrdered = ordered;
    listItems.push(text);
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line === "" || line.startsWith(TITLE_PREFIX) || line.startsWith(SOURCE_PREFIX)) {
      flushList();
      continue;
    }
    if (line.startsWith(HEADING_3)) {
      flushList();
      blocks.push({ type: "heading", level: 3, text: line.slice(HEADING_3.length).trim() });
      continue;
    }
    if (line.startsWith(HEADING_2)) {
      flushList();
      blocks.push({ type: "heading", level: 2, text: line.slice(HEADING_2.length).trim() });
      continue;
    }

    const unordered = UNORDERED_ITEM.exec(line);
    if (unordered) {
      pushItem(unordered[1].trim(), false);
      continue;
    }
    const ordered = ORDERED_ITEM.exec(line);
    if (ordered) {
      pushItem(ordered[1].trim(), true);
      continue;
    }

    flushList();
    blocks.push({ type: "paragraph", text: line });
  }

  flushList();
  return blocks;
}

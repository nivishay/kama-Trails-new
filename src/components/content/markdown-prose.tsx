import { parseMarkdownBlocks } from "@/lib/content/markdown";

/** Renders the legal-doc markdown subset as styled RTL prose. */
export function MarkdownProse({ markdown }: { markdown: string }) {
  const blocks = parseMarkdownBlocks(markdown);
  return (
    <div className="space-y-4 text-right leading-relaxed text-muted-foreground">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const key = `h-${index}`;
          return block.level === 2 ? (
            <h2 key={key} className="mt-8 mb-2 text-xl font-bold text-ink">
              {block.text}
            </h2>
          ) : (
            <h3 key={key} className="mt-6 mb-1 text-lg font-semibold text-ink">
              {block.text}
            </h3>
          );
        }
        if (block.type === "list") {
          const items = block.items.map((item, i) => (
            <li key={`li-${index}-${i}`}>{item}</li>
          ));
          return block.ordered ? (
            <ol key={`ol-${index}`} className="list-decimal space-y-1.5 pr-6">
              {items}
            </ol>
          ) : (
            <ul key={`ul-${index}`} className="list-disc space-y-1.5 pr-6">
              {items}
            </ul>
          );
        }
        return <p key={`p-${index}`}>{block.text}</p>;
      })}
    </div>
  );
}

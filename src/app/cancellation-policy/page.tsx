import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { MarkdownProse } from "@/components/content/markdown-prose";

const MARKDOWN = readFileSync(
  join(process.cwd(), "src/content/legal/cancellation-policy.md"),
  "utf8",
);

export const metadata: Metadata = { title: "מדיניות ביטולים" };

export default function CancellationPolicyPage() {
  return (
    <div>
      <PageHero eyebrow="שבילי קמה" title="מדיניות ביטולים" />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <MarkdownProse markdown={MARKDOWN} />
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ContentSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Right-aligned content band for the static marketing pages (About, Rope Park,
 * Course). Stacks a bordered section with an optional heading and a prose body;
 * mirrors the `TrailSection` shape used on the trail detail page.
 */
export function ContentSection({
  title,
  children,
  className,
}: ContentSectionProps) {
  return (
    <section className={cn("border-b border-border last:border-0", className)}>
      <div className="mx-auto max-w-3xl px-4 py-12 text-right">
        {title && <h2 className="mb-4 text-2xl font-bold text-ink">{title}</h2>}
        <div className="space-y-4 leading-relaxed text-muted-foreground">
          {children}
        </div>
      </div>
    </section>
  );
}

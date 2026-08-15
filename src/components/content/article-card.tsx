import Image from "next/image";
import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { formatPublishedDate } from "@/lib/format/date";
import type { ArticleListItem } from "@/lib/content/types";

/** A single article summary card for the public `/articles` grid. */
export function ArticleCard({ article }: { article: ArticleListItem }) {
  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-background transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {article.hero_image ? (
          <Image
            src={article.hero_image}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageIcon className="size-10" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        {article.published_at && (
          <time
            dateTime={article.published_at}
            className="text-xs text-muted-foreground"
          >
            {formatPublishedDate(article.published_at)}
          </time>
        )}
        <h2 className="mt-1 text-lg font-bold text-ink group-hover:text-primary">
          {article.title}
        </h2>
        {article.excerpt && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {article.excerpt}
          </p>
        )}
      </div>
    </Link>
  );
}

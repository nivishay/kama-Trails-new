import type { Metadata } from "next";
import { getPublishedArticles } from "@/lib/content/articles";
import { PageHero } from "@/components/layout/page-hero";
import { ArticleCard } from "@/components/content/article-card";

// Articles change rarely; serve statically and regenerate in the background (ISR),
// same as the trails catalog. Publishing/editing calls revalidatePath("/articles").
export const revalidate = 60;

export const metadata: Metadata = {
  title: "מאמרים",
  description:
    "מאמרים, טיפים וסיפורים מהשטח של שבילי קמה — על סנפלינג, מסלולים וטיולי אתגר בישראל.",
};

export default async function ArticlesPage() {
  const articles = await getPublishedArticles();

  return (
    <div>
      <PageHero
        eyebrow="הבלוג שלנו"
        title="מאמרים"
        description="טיפים, סיפורים מהשטח ומדריכים על סנפלינג, מסלולים וטיולי אתגר."
        backgroundImage={articles[0]?.hero_image}
      />
      <div className="mx-auto max-w-6xl px-4 py-14">
        {articles.length === 0 ? (
          <p className="rounded-2xl border border-border bg-background p-10 text-center text-muted-foreground">
            עדיין אין מאמרים. בקרוב נעלה כאן תכנים חדשים — חזרו לבקר!
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

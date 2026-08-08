import { PageHero } from "./page-hero";

/** Placeholder body for nav routes whose real content lands in a later increment. */
export function ComingSoon({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <PageHero eyebrow={eyebrow} title={title} description={description} />
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-lg text-muted-foreground">
          העמוד בבנייה — התוכן המלא יעלה בקרוב.
        </p>
      </div>
    </div>
  );
}

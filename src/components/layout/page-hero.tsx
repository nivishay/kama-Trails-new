import Image from "next/image";

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  backgroundImage?: string | null;
}

/** Compact hero band used on catalog and content pages (RTL, right-aligned). */
export function PageHero({
  eyebrow,
  title,
  description,
  backgroundImage,
}: PageHeroProps) {
  return (
    <section className="relative overflow-hidden bg-ink text-ink-foreground">
      {backgroundImage && (
        <Image
          src={backgroundImage}
          alt=""
          fill
          sizes="100vw"
          className="z-0 object-cover opacity-40"
          priority
        />
      )}
      <div className="absolute inset-0 z-10 bg-gradient-to-l from-ink/70 via-ink/40 to-ink/80" />
      <div className="relative z-20 mx-auto max-w-6xl px-4 py-20 text-right">
        {eyebrow && (
          <p className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-primary">
            {eyebrow}
            <span className="inline-block h-0.5 w-8 rounded-full bg-primary" />
          </p>
        )}
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {description && (
          <p className="mt-3 max-w-2xl text-ink-muted sm:ms-auto">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}

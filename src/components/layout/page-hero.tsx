import Image from "next/image";
import { HeroVideo } from "@/components/home/hero-video";

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Resolved (loadable) background image URL. Ignored when `videoSrc` is set. */
  backgroundImage?: string | null;
  /** Resolved background video URL; takes precedence over `backgroundImage`. */
  videoSrc?: string | null;
  /** Poster/still for the video (also the reduced-motion fallback). */
  posterSrc?: string | null;
}

/** Compact hero band used on catalog and content pages (RTL, right-aligned).
 *  Falls back to a plain dark band when no media is supplied. */
export function PageHero({
  eyebrow,
  title,
  description,
  backgroundImage,
  videoSrc,
  posterSrc,
}: PageHeroProps) {
  const hasMedia = Boolean(videoSrc || backgroundImage);
  return (
    <section className="relative overflow-hidden bg-ink text-ink-foreground">
      {videoSrc ? (
        <HeroVideo src={videoSrc} poster={posterSrc ?? undefined} />
      ) : (
        backgroundImage && (
          <Image
            src={backgroundImage}
            alt=""
            fill
            sizes="100vw"
            className="z-0 object-cover"
            priority
          />
        )
      )}
      {/* Darken just enough for the text to stay readable over the media; over a
          bare dark band (no media) this simply keeps it dark. */}
      <div className="absolute inset-0 z-10 bg-gradient-to-l from-ink/80 via-ink/45 to-ink/70" />
      <div
        className={`relative z-20 mx-auto max-w-6xl px-4 py-20 text-right ${
          hasMedia ? "[text-shadow:0_2px_10px_rgba(0,0,0,0.6)]" : ""
        }`}
      >
        {eyebrow && (
          <p className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-primary">
            {eyebrow}
            <span className="inline-block h-0.5 w-8 rounded-full bg-primary" />
          </p>
        )}
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {description && (
          <p className="mt-3 max-w-2xl text-ink-foreground/90 sm:ms-auto">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}

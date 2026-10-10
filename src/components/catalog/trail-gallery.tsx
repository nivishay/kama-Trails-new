"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { trailImageUrl } from "@/lib/catalog/trail-image";
import { cn } from "@/lib/utils";

interface TrailGalleryProps {
  /** Raw stored image references (relative trip_photos paths or absolute URLs). */
  images: string[];
  trailName: string;
}

/** Auto-advance interval for the carousel, in milliseconds. */
const AUTO_ADVANCE_MS = 5000;

/**
 * Trail photo gallery: a large one-photo-at-a-time carousel that auto-advances,
 * with prev/next arrows and a thumbnail strip for jumping. Clicking the main
 * photo opens a full-screen lightbox. RTL-aware — the left arrow advances and
 * the right arrow goes back, matching the page's right-to-left reading
 * direction. Renders nothing when the trail has no resolvable images.
 */
export function TrailGallery({ images, trailName }: TrailGalleryProps) {
  const urls = images
    .map((ref) => trailImageUrl(ref))
    .filter((url): url is string => url !== null);

  const count = urls.length;
  const [current, setCurrent] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback(
    (index: number) => setCurrent(((index % count) + count) % count),
    [count],
  );
  const showNext = useCallback(() => goTo(current + 1), [goTo, current]);
  const showPrev = useCallback(() => goTo(current - 1), [goTo, current]);
  const openLightbox = useCallback(() => setLightboxOpen(true), []);
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  // Auto-advance the carousel, pausing while the pointer hovers it or the
  // lightbox is open so the viewer stays in control.
  useEffect(() => {
    if (count <= 1 || paused || lightboxOpen) return;
    const timer = window.setInterval(showNext, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [count, paused, lightboxOpen, showNext]);

  // Keyboard control for the open lightbox (RTL: ArrowLeft advances).
  useEffect(() => {
    if (!lightboxOpen) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeLightbox();
      else if (event.key === "ArrowLeft") showNext();
      else if (event.key === "ArrowRight") showPrev();
    }

    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen, closeLightbox, showNext, showPrev]);

  if (count === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="mb-3 text-xl font-bold text-ink">גלריה</h2>

      <div
        className="relative aspect-[3/2] w-full overflow-hidden rounded-xl bg-muted"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <button
          type="button"
          onClick={openLightbox}
          aria-label={`הגדלת תמונה ${current + 1} מתוך ${count}`}
          className="group block size-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Image
            src={urls[current]}
            alt={`${trailName} — תמונה ${current + 1}`}
            fill
            sizes="(max-width: 1024px) 100vw, 66vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority
          />
        </button>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={showNext}
              aria-label="התמונה הבאה"
              className="absolute top-1/2 left-3 z-10 -translate-y-1/2 rounded-full bg-ink/60 p-2 text-ink-foreground transition-colors hover:bg-ink/80"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              onClick={showPrev}
              aria-label="התמונה הקודמת"
              className="absolute top-1/2 right-3 z-10 -translate-y-1/2 rounded-full bg-ink/60 p-2 text-ink-foreground transition-colors hover:bg-ink/80"
            >
              <ChevronRight className="size-6" />
            </button>

            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink/60 px-3 py-1 text-sm text-ink-foreground">
              {current + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {urls.map((url, index) => (
            <li key={url} className="shrink-0">
              <button
                type="button"
                onClick={() => goTo(index)}
                aria-label={`מעבר לתמונה ${index + 1} מתוך ${count}`}
                aria-current={index === current}
                className={cn(
                  "relative block aspect-square w-20 overflow-hidden rounded-lg transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  index === current
                    ? "ring-2 ring-primary ring-offset-2"
                    : "opacity-60 hover:opacity-100",
                )}
              >
                <Image
                  src={url}
                  alt={`${trailName} — תמונה ממוזערת ${index + 1}`}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`גלריית תמונות של ${trailName}`}
          onClick={closeLightbox}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4"
        >
          <button
            type="button"
            onClick={closeLightbox}
            aria-label="סגירת הגלריה"
            className="absolute top-4 right-4 z-10 rounded-full bg-ink/60 p-2 text-ink-foreground transition-colors hover:bg-ink/80"
          >
            <X className="size-6" />
          </button>

          {count > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showNext();
                }}
                aria-label="התמונה הבאה"
                className="absolute left-4 z-10 rounded-full bg-ink/60 p-2 text-ink-foreground transition-colors hover:bg-ink/80"
              >
                <ChevronLeft className="size-8" />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showPrev();
                }}
                aria-label="התמונה הקודמת"
                className="absolute right-4 z-10 rounded-full bg-ink/60 p-2 text-ink-foreground transition-colors hover:bg-ink/80"
              >
                <ChevronRight className="size-8" />
              </button>
            </>
          )}

          <div
            onClick={(event) => event.stopPropagation()}
            className="relative h-full max-h-[85vh] w-full max-w-5xl"
          >
            <Image
              src={urls[current]}
              alt={`${trailName} — תמונה ${current + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>

          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-ink/60 px-3 py-1 text-sm text-ink-foreground">
            {current + 1} / {count}
          </span>
        </div>
      )}
    </section>
  );
}

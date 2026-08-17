"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { trailImageUrl } from "@/lib/catalog/trail-image";

interface TrailGalleryProps {
  /** Raw stored image references (relative trip_photos paths or absolute URLs). */
  images: string[];
  trailName: string;
}

/**
 * Trail photo gallery: a responsive thumbnail grid that opens a full-screen
 * lightbox with prev/next. RTL-aware — ArrowLeft advances, ArrowRight goes back,
 * matching the page's right-to-left reading direction. Renders nothing when the
 * trail has no resolvable images.
 */
export function TrailGallery({ images, trailName }: TrailGalleryProps) {
  const urls = images
    .map((ref) => trailImageUrl(ref))
    .filter((url): url is string => url !== null);

  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const count = urls.length;

  const close = useCallback(() => setOpenIndex(null), []);
  const showNext = useCallback(
    () => setOpenIndex((i) => (i === null ? i : (i + 1) % count)),
    [count],
  );
  const showPrev = useCallback(
    () => setOpenIndex((i) => (i === null ? i : (i - 1 + count) % count)),
    [count],
  );

  useEffect(() => {
    if (openIndex === null) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowLeft") showNext();
      else if (event.key === "ArrowRight") showPrev();
    }

    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openIndex, close, showNext, showPrev]);

  if (count === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="mb-3 text-xl font-bold text-ink">גלריה</h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {urls.map((url, index) => (
          <li key={url}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-label={`הצגת תמונה ${index + 1} מתוך ${count}`}
              className="group relative block aspect-square w-full overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Image
                src={url}
                alt={`${trailName} — תמונה ${index + 1}`}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>

      {openIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`גלריית תמונות של ${trailName}`}
          onClick={close}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4"
        >
          <button
            type="button"
            onClick={close}
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
              src={urls[openIndex]}
              alt={`${trailName} — תמונה ${openIndex + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>

          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-ink/60 px-3 py-1 text-sm text-ink-foreground">
            {openIndex + 1} / {count}
          </span>
        </div>
      )}
    </section>
  );
}

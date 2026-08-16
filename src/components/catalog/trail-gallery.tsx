import Image from "next/image";

interface TrailGalleryProps {
  images: string[];
  trailName: string;
}

/** Responsive photo grid for a trail's detail page; renders nothing when empty. */
export function TrailGallery({ images, trailName }: TrailGalleryProps) {
  if (images.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="mb-3 text-xl font-bold text-ink">גלריה</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((src, index) => (
          <div
            key={src}
            className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted"
          >
            <Image
              src={src}
              alt={`${trailName} — תמונה ${index + 1}`}
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 hover:scale-105"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

import Image from "next/image";
import type { PartnerLogo } from "@/lib/content/partner-logos";

/**
 * The "גאים לשרת את מאות לקוחותינו" client-logo strip (mirrors the old site's
 * client row). Renders nothing when there are no logos, so the homepage never
 * shows an empty heading. Logos are served unoptimized — they're tiny and the
 * set mixes PNG/JPG/SVG.
 */
export function PartnerLogosStrip({ logos }: { logos: PartnerLogo[] }) {
  if (logos.length === 0) {
    return null;
  }

  return (
    <section className="border-y border-border bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">
          גאים לשרת את מאות לקוחותינו
        </h2>
        <ul className="mt-10 grid grid-cols-3 items-center gap-x-6 gap-y-10 sm:grid-cols-4 md:grid-cols-6">
          {logos.map((logo) => (
            <li key={logo.id} className="flex items-center justify-center">
              <Image
                src={logo.image_path}
                alt={logo.name}
                width={160}
                height={80}
                unoptimized
                className="h-14 w-auto object-contain"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

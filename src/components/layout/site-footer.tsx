import Link from "next/link";
import { MapPin, Mail, Phone } from "lucide-react";
import { CONTACT, NAV_LINKS, SITE_NAME } from "@/lib/site";
import { SocialLinks } from "./social-links";

const SITEMAP_LINKS = NAV_LINKS.filter((link) =>
  ["/", "/trails", "/about", "/testimonials", "/contact"].includes(link.href),
);

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink text-ink-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <section>
          <h2 className="mb-4 text-lg font-bold">צרו איתנו קשר</h2>
          <ul className="space-y-2.5 text-sm text-ink-muted">
            <li className="flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-primary" />
              <a href={CONTACT.phoneHref} className="hover:text-ink-foreground">
                {CONTACT.phone}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4 shrink-0 text-primary" />
              <a
                href={`mailto:${CONTACT.email}`}
                className="hover:text-ink-foreground"
              >
                {CONTACT.email}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-primary" />
              <span>{CONTACT.address}</span>
            </li>
          </ul>
          <SocialLinks className="mt-5 text-ink-foreground" />
        </section>

        <nav>
          <h2 className="mb-4 text-lg font-bold">מה באתר</h2>
          <ul className="space-y-2.5 text-sm text-ink-muted">
            {SITEMAP_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-ink-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section>
          <h2 className="mb-4 text-lg font-bold">
            אנחנו עומדים לרשותכם בכל הקשור לסנפלינג בישראל
          </h2>
          <p className="text-sm text-ink-muted">
            טיולי סנפלינג, קניונינג ואתגר מודרכים לכל גיל — למשפחות, זוגות, בתי
            ספר וארגונים.
          </p>
        </section>
      </div>

      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-center text-xs text-ink-muted">
          © {year} כל הזכויות שמורות ל{SITE_NAME}
        </p>
      </div>
    </footer>
  );
}

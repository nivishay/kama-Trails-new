/**
 * Static site configuration: primary navigation and contact details.
 * Contact/social values are sourced from the live site (meetings_docs/scrape_old.txt).
 * Routes mirror the base44 POC; Hebrew-slug redirects are handled in the SEO phase.
 */

export type NavLink = { label: string; href: string };

export const NAV_LINKS: NavLink[] = [
  { label: "בית", href: "/" },
  { label: "הטיולים שלנו", href: "/trails" },
  { label: "אודותינו", href: "/about" },
  { label: "המלצות", href: "/testimonials" },
  { label: "טיולי סנפלינג", href: "/rappelling" },
  { label: "פארק חבלים", href: "/rope-park" },
  { label: "קורס גולש עצמאי", href: "/course" },
  { label: "צור קשר", href: "/contact" },
];

export const CONTACT = {
  phone: "053-4844874",
  phoneHref: "tel:0534844874",
  email: "shvilkama@gmail.com",
  address: "מושב מעלה גמלא 1294900",
  instagram: "https://www.instagram.com/kamatrails/",
  facebook: "https://www.facebook.com/kama.trails",
  whatsapp: "https://web.whatsapp.com/send?phone=972534844874",
} as const;

export const SITE_NAME = "שבילי קמה";

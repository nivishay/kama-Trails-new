import { Mail } from "lucide-react";
import { CONTACT } from "@/lib/site";
import { FacebookIcon, InstagramIcon, WhatsappIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const ICON_CLASS = "size-4";

const LINKS = [
  { label: "וואטסאפ", href: CONTACT.whatsapp, Icon: WhatsappIcon },
  { label: "פייסבוק", href: CONTACT.facebook, Icon: FacebookIcon },
  { label: "אינסטגרם", href: CONTACT.instagram, Icon: InstagramIcon },
  { label: "אימייל", href: `mailto:${CONTACT.email}`, Icon: Mail },
];

/** Row of social/contact icon links, reused in the header and footer. */
export function SocialLinks({ className }: { className?: string }) {
  return (
    <ul className={cn("flex items-center gap-3", className)}>
      {LINKS.map(({ label, href, Icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="text-current/70 transition-colors hover:text-primary"
          >
            <Icon className={ICON_CLASS} />
          </a>
        </li>
      ))}
    </ul>
  );
}

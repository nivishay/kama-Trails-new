import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";
import { SocialLinks } from "@/components/layout/social-links";
import { CONTACT } from "@/lib/site";

export const metadata: Metadata = { title: "צור קשר" };

export default function ContactPage() {
  return (
    <div>
      <PageHero
        eyebrow="נשמח לשמוע מכם"
        title="צור קשר"
        description="לכל שאלה על טיול, קבוצה או תאריך — דברו איתנו."
      />
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ul className="space-y-4 text-ink">
          <li className="flex items-center gap-3">
            <Phone className="size-5 text-primary" />
            <a href={CONTACT.phoneHref} className="hover:text-primary">
              {CONTACT.phone}
            </a>
          </li>
          <li className="flex items-center gap-3">
            <Mail className="size-5 text-primary" />
            <a href={`mailto:${CONTACT.email}`} className="hover:text-primary">
              {CONTACT.email}
            </a>
          </li>
          <li className="flex items-center gap-3">
            <MapPin className="size-5 text-primary" />
            <span>{CONTACT.address}</span>
          </li>
        </ul>
        <SocialLinks className="mt-6 text-ink" />
        <p className="mt-10 text-muted-foreground">
          טופס יצירת קשר יעלה בקרוב.
        </p>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/page-hero";
import { ContentSection } from "@/components/content/content-section";
import { Button } from "@/components/ui/button";
import {
  AUDIENCE_TYPES,
  COMPANY_INTRO_POINTS,
  WHY_CHOOSE_US,
} from "@/lib/content/company";

export const metadata: Metadata = {
  title: "אודות",
  description:
    "שבילי קמה — חברה ממעלה גמלא העוסקת בהדרכות וטיולי סנפלינג בכל רחבי הארץ, בהסמכת וינגייט ומשרד התרבות והספורט.",
};

export default function AboutPage() {
  return (
    <div>
      <PageHero
        eyebrow="עלינו"
        title="אודות"
        description="אנחנו חברה ממעלה גמלא, העוסקת בהדרכות וטיולי סנפלינג בכל רחבי הארץ."
      />

      <ContentSection title='נעים מאוד!! אנחנו צוות "שבילי קמה"' centered>
        {COMPANY_INTRO_POINTS.map((point) => (
          <p key={point}>{point}</p>
        ))}
      </ContentSection>

      <ContentSection title="למי סנפלינג מיועד?" centered>
        <p>במהלך השנים צברנו ניסיון בהדרכת סנפלינג לכל הגילאים:</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {AUDIENCE_TYPES.map((audience) => (
            <div
              key={audience.title}
              className="rounded-xl border border-border bg-card p-5"
            >
              <h3 className="font-bold text-ink">{audience.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {audience.text}
              </p>
            </div>
          ))}
        </div>
      </ContentSection>

      <ContentSection title='למה כדאי לכם לבחור "שבילי קמה"?'>
        <ol className="space-y-4">
          {WHY_CHOOSE_US.map((reason, index) => (
            <li
              key={reason}
              className="flex gap-4 rounded-lg bg-card p-4 shadow-sm"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                {index + 1}
              </span>
              <span className="pt-1 text-ink">{reason}</span>
            </li>
          ))}
        </ol>
      </ContentSection>

      <ContentSection centered>
        <div className="rounded-xl bg-muted/40 p-8">
          <h2 className="text-2xl font-bold text-ink">
            להזמנות ופרטים נוספים דברו איתנו
          </h2>
          <p className="mt-2 text-muted-foreground">
            נשמח להתאים לכם טיול סנפלינג לקבוצה, למשפחה או לארגון.
          </p>
          <Button asChild variant="primary" size="lg" className="mt-6">
            <Link href="/contact">צרו קשר</Link>
          </Button>
        </div>
      </ContentSection>
    </div>
  );
}

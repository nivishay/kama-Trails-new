import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/page-hero";
import { ContentSection } from "@/components/content/content-section";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "פארק חבלים",
  description:
    "פארקי חבלים ניידים בכל רחבי הארץ — מתקנים מהנים ומאתגרים לכל הגילאים, בהתאמה אישית לאירועים, גיבושים ובתי ספר.",
};

// Copy sourced verbatim from the live site (meetings_docs/scrape_old.txt).
const INTRO_POINTS = [
  "אנחנו מגיעים לכל רחבי הארץ עם מתקני פארק חבלים ניידים, מהנים ומאתגרים ומקימים את המתקנים בהתאם לרצון וצרכי הלקוח.",
  "פשוט בשביל הכיף או עם משימות והפקת ערך מוסף.",
  "ניתן לבחור את מספר המתקנים שרוצים להקים.",
];

const STATIONS = [
  "גשר חבלים תלוי",
  "נדנדת סווינג",
  "אומגה",
  "סולם ענקים",
  "עמוד טיפוס",
  "קיר טיפוס על עץ",
  "סולם חבלים",
];

const WHY_ROPE_PARK = [
  "ניתן למקם כמעט בכל מקום בארץ.",
  "מתאים למגוון אירועים: ימי שיא/גיבוש, ימי הולדת, ימי חברה, בר/בת מצווה, אירועי תנועות נוער, אירועים קהילתיים, הפנינג ועוד.",
  "מגוון גדול של מתקנים לכל הגילאים.",
  "יכול לשמש ככלי חינוכי/התפתחותי ולפעילויות תהליכיות.",
];

const SAFETY_NOTE =
  'הפעילות מתבצעת ע"י מדריכים מוסמכים ומנוסים, ציוד בעל תקן, מכוסה בביטוח ספורט אתגרי.';

export default function RopeParkPage() {
  return (
    <div>
      <PageHero
        eyebrow="אתגר"
        title="פארק חבלים"
        description="פארקי חבלים ניידים בכל רחבי הארץ."
      />

      <ContentSection>
        <ul className="space-y-3">
          {INTRO_POINTS.map((point) => (
            <li key={point} className="flex gap-2">
              <span aria-hidden className="text-primary">
                •
              </span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </ContentSection>

      <ContentSection title="מגוון מתקנים שמתאימים לכל הגילאים">
        <ul className="flex flex-wrap justify-end gap-2">
          {STATIONS.map((station) => (
            <li
              key={station}
              className="rounded-full bg-primary/10 px-4 py-1.5 font-medium text-primary"
            >
              {station}
            </li>
          ))}
        </ul>
      </ContentSection>

      <ContentSection title="למה כדאי לבחור בפארק חבלים">
        <ol className="space-y-4">
          {WHY_ROPE_PARK.map((reason, index) => (
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
        <p className="mt-4 rounded-lg bg-muted/40 p-4 text-sm">{SAFETY_NOTE}</p>
      </ContentSection>

      <ContentSection>
        <div className="rounded-xl bg-muted/40 p-8 text-center">
          <h2 className="text-2xl font-bold text-ink">
            רוצים פארק חבלים באירוע שלכם?
          </h2>
          <p className="mt-2 text-muted-foreground">
            ספרו לנו על האירוע ונתאים לכם את המתקנים המתאימים.
          </p>
          <Button asChild variant="primary" size="lg" className="mt-6">
            <Link href="/contact">צרו קשר</Link>
          </Button>
        </div>
      </ContentSection>
    </div>
  );
}

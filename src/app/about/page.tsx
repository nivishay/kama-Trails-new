import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/page-hero";
import { ContentSection } from "@/components/content/content-section";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "אודות",
  description:
    "שבילי קמה — חברה ממעלה גמלא העוסקת בהדרכות וטיולי סנפלינג בכל רחבי הארץ, בהסמכת וינגייט ומשרד התרבות והספורט.",
};

// Copy sourced verbatim from the live site (meetings_docs/scrape_old.txt).
const INTRO_POINTS = [
  "אנחנו חברה ממעלה גמלא, העוסקת בהדרכות וטיולי סנפלינג בכל רחבי הארץ!",
  "חיים סנפלינג, נושמים סנפלינג, ואוהבים מאוד להדריך וללוות טיולי סנפלינג.",
  "מוסמכים על ידי וינגייט ומשרד התרבות והספורט. ותק של מעל 15 שנה.",
];

const WHY_CHOOSE_US = [
  "יחס אישי והדרכה סבלנית לכל מטייל, מדריכים נבחרים בקפידה ומקצועיים.",
  "ניסיון של שנים בהובלה וארגון טיולים ברחבי הארץ, במגוון מסגרות והיקפים.",
  "פועלים לפי כללי בטיחות קפדניים – כל מדריך מוסמך ובעל תעודה.",
  "ציוד בעל תו תקן בינלאומי, נבדק בקפידה.",
  "כיסוי ביטוחי לכל פעילות, ניתן להרחיב לפעילויות פחות נפוצות. קהל יעד: חברות וארגונים (ימי כיף, גיבוש, טיולים), קבוצות גדולות/קטנות, קיטנות ובתי ספר, בר/בת מצווה, טיולי משפחות.",
  "שילוב בין טיול אתגרי-כיפי לטיול תוכן — דגש גם על תוכן/הדרכה וגם על האתגר.",
  "חשוב לנו שתהנו מהסנפלינג — השירות המקצועי והנעים ביותר בארץ.",
];

export default function AboutPage() {
  return (
    <div>
      <PageHero
        eyebrow="עלינו"
        title="אודות"
        description="אנחנו חברה ממעלה גמלא, העוסקת בהדרכות וטיולי סנפלינג בכל רחבי הארץ."
      />

      <ContentSection title='נעים מאוד!! אנחנו צוות "שבילי קמה"'>
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

      <ContentSection>
        <div className="rounded-xl bg-muted/40 p-8 text-center">
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

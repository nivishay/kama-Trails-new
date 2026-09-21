import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/page-hero";
import { ContentSection } from "@/components/content/content-section";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "קורס גולש עצמאי",
  description:
    "קורס גולש עצמאי של שבילי קמה — 3 ימים המקנים כלים וידע לצאת לשטח באופן עצמאי ובטוח, בקבוצות קטנות וביחס אישי.",
};

// Copy sourced verbatim from the live site (meetings_docs/scrape_old.txt).
const WHO_ITS_FOR = [
  "למי שרוצה לקחת ציוד סנפלינג ולטייל באופן עצמאי ללא מדריך.",
  "למי שרוצה לעשות זאת בצורה בטוחה ומתודית.",
  "אין צורך בניסיון רב – מספיקה חוויה חיובית קודמת ורצון ללמוד.",
];

const HOW_IT_WORKS = [
  "משך: 3 ימים מלאים.",
  "יומיים ראשונים: לימוד חומר ותרגול באחד ממצוקי הארץ.",
  "יום שלישי: תרגול באחד ממסלולי הנחלים, בהשגחה צמודה.",
];

const WHY_LEARN_WITH_US = [
  "יחס אישי וסובלני, קבוצות קטנות, אווירה טובה",
  "תמיכה וייעוץ גם לאחר סיום הקורס",
  "הצטרפות לקהילת בוגרי הקורס",
  "הנחות לרכישת ציוד",
];

const SYLLABUS = [
  "מבוא ורקע לעולם החבלים",
  "הכרת הציוד – תקנים, תקינות ומתי לא להשתמש",
  "לימוד קשרים",
  "לימוד סוגי עגינות",
  "חלוקת משקל בעגינות",
  "התנהלות בשפת מצוק",
  "גלישה עצמית (חבל יחיד ושני חבלים)",
  "גלישה עם פרוסיק (תחתון + עליון)",
  "אבטחת כבאים",
  "גלישה עם ציוד כבד",
  "נעילת מכשיר חיכוך",
  "טיפוס פרוסיקים",
  "גולש אחרון",
  "גלישה למים",
  "מעבר קשר בגלישה",
];

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span aria-hidden className="text-primary">
            •
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function CoursePage() {
  return (
    <div>
      <PageHero
        eyebrow="הכשרה"
        title="קורס גולש עצמאי"
        description="כלים וידע לצאת לשטח באופן עצמאי ובטוח."
      />

      <ContentSection title="מה נותן הקורס?">
        <p>
          קורס גולש עצמאי מקנה כלים וידע לצאת בצורה עצמאית לשטח ולהשתמש בסנפלינג
          ככלי לטיול/הנאה, תוך דגש על בטיחות.
        </p>
      </ContentSection>

      <ContentSection title="למי מיועד הקורס?">
        <BulletList items={WHO_ITS_FOR} />
      </ContentSection>

      <ContentSection title="איך מתנהל הקורס?">
        <BulletList items={HOW_IT_WORKS} />
      </ContentSection>

      <ContentSection title="למה כדאי לכם ללמוד אצלנו?">
        <BulletList items={WHY_LEARN_WITH_US} />
      </ContentSection>

      <ContentSection title="סילבוס הקורס">
        <ul className="grid gap-2 sm:grid-cols-2">
          {SYLLABUS.map((topic) => (
            <li
              key={topic}
              className="flex gap-2 rounded-lg bg-card p-3 shadow-sm"
            >
              <span aria-hidden className="text-primary">
                •
              </span>
              <span className="text-ink">{topic}</span>
            </li>
          ))}
        </ul>
      </ContentSection>

      <ContentSection>
        <div className="rounded-xl bg-muted/40 p-8 text-center">
          <h2 className="text-2xl font-bold text-ink">רוצים להצטרף לקורס?</h2>
          <p className="mt-2 text-muted-foreground">
            השאירו פרטים ונחזור אליכם עם כל המידע והתאריכים הקרובים.
          </p>
          <Button asChild variant="primary" size="lg" className="mt-6">
            <Link href="/contact">להרשמה</Link>
          </Button>
        </div>
      </ContentSection>
    </div>
  );
}

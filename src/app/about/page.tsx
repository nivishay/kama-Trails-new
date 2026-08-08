import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "אודותינו" };

export default function AboutPage() {
  return (
    <ComingSoon
      eyebrow="עלינו"
      title="אודותינו"
      description="הכירו את שבילי קמה — הצוות, הניסיון והתשוקה לסנפלינג ואתגר."
    />
  );
}

import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "טיולי סנפלינג" };

export default function RappellingPage() {
  return (
    <ComingSoon
      eyebrow="סנפלינג"
      title="טיולי סנפלינג"
      description="כל מה שצריך לדעת על טיולי הסנפלינג שלנו ברחבי הארץ."
    />
  );
}

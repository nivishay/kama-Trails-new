import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "פארק חבלים" };

export default function RopeParkPage() {
  return (
    <ComingSoon
      eyebrow="אתגר"
      title="פארק חבלים"
      description="פארק החבלים של שבילי קמה — חוויה אתגרית לכל המשפחה."
    />
  );
}

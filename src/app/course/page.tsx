import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "קורס גולש עצמאי" };

export default function CoursePage() {
  return (
    <ComingSoon
      eyebrow="הכשרה"
      title="קורס גולש עצמאי"
      description="קורס להכשרת גולשים עצמאיים — סנפלינג בטוח ואחראי."
    />
  );
}

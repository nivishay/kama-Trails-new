import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "המלצות" };

export default function TestimonialsPage() {
  return (
    <ComingSoon
      eyebrow="לקוחות ממליצים"
      title="המלצות"
      description="מה אומרים המשתתפים שיצאו איתנו לטיולי סנפלינג ואתגר."
    />
  );
}

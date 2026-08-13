import type { Metadata } from "next";
import type { ReactNode } from "react";

// The admin area is never part of the public site's SEO (DECISIONS #3): keep it
// out of every search index.
export const metadata: Metadata = {
  title: "ניהול",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}

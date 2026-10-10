"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AccessibilityWidget } from "@/components/accessibility/accessibility-widget";
import { CookieConsent } from "@/components/layout/cookie-consent";

/**
 * Wraps the public site header/footer around page content, but drops them on the
 * /admin area, which has its own shell. Header and footer are passed in as nodes
 * so the server-rendered footer stays a server component.
 */
export function SiteChrome({
  header,
  footer,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  return (
    <>
      {!isAdmin && header}
      <main className="flex-1">{children}</main>
      {!isAdmin && footer}
      {!isAdmin && (
        <>
          <AccessibilityWidget />
          <CookieConsent />
        </>
      )}
    </>
  );
}

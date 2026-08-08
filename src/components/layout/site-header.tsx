"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Mountain, X } from "lucide-react";
import { NAV_LINKS, SITE_NAME } from "@/lib/site";
import { SocialLinks } from "./social-links";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 font-bold text-ink"
      aria-label={SITE_NAME}
    >
      <Mountain className="size-7 text-primary" />
      <span className="text-lg">{SITE_NAME}</span>
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium text-ink/80 transition-colors hover:text-ink",
                isActive(pathname, link.href) &&
                  "text-ink after:mx-auto after:mt-1 after:block after:h-0.5 after:w-5 after:rounded-full after:bg-primary",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <SocialLinks className="hidden text-ink sm:flex" />
          <button
            type="button"
            className="text-ink lg:hidden"
            aria-label={mobileOpen ? "סגירת תפריט" : "פתיחת תפריט"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? (
              <X className="size-6" />
            ) : (
              <Menu className="size-6" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-border bg-background lg:hidden">
          <ul className="mx-auto flex max-w-6xl flex-col px-4 py-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "block rounded-md px-2 py-2.5 text-sm font-medium text-ink/80 hover:bg-muted",
                    isActive(pathname, link.href) && "text-primary",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

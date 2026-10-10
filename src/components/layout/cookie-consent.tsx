"use client";

import { useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsClient } from "@/lib/use-is-client";

/**
 * Cookie notice (replaces the WordPress cookie plugin from the old site). The
 * choice is remembered in localStorage so the banner shows only until the
 * visitor responds. We load no tracking scripts yet, so this is an informational
 * notice; when analytics/marketing cookies are added, gate them on "accepted".
 */

const STORAGE_KEY = "kama-cookie-consent";

function hasStoredChoice(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function CookieConsent() {
  const isClient = useIsClient();
  const [dismissed, setDismissed] = useState(false);
  // Lazy init records whether a choice was already stored. On the server
  // localStorage is absent, so this is false there; the banner stays hidden
  // until `isClient` flips true after hydration, avoiding any mismatch.
  const [alreadyChosen] = useState(hasStoredChoice);

  const respond = (choice: "accepted" | "necessary") => {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Storage unavailable — just dismiss for this session.
    }
    setDismissed(true);
  };

  if (!isClient || alreadyChosen || dismissed) return null;

  return (
    <div
      role="dialog"
      aria-label="הודעת עוגיות"
      className="fixed inset-x-0 bottom-0 z-[55] border-t border-white/10 bg-ink text-ink-foreground"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 size-6 shrink-0 text-primary" />
          <p className="text-sm text-ink-muted">
            אנחנו משתמשים בקובצי Cookie כדי לשפר את חוויית הגלישה שלך באתר. ניתן
            לקרוא עוד ב
            <Link
              href="/privacy"
              className="underline hover:text-ink-foreground"
            >
              מדיניות הפרטיות
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-2 sm:ms-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => respond("necessary")}
            className="border-white/30 text-ink-foreground hover:bg-white/10 hover:text-ink-foreground"
          >
            הכרחי בלבד
          </Button>
          <Button size="sm" onClick={() => respond("accepted")}>
            לאשר הכול
          </Button>
        </div>
      </div>
    </div>
  );
}

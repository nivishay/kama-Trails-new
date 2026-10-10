"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Accessibility,
  X,
  Plus,
  Minus,
  Contrast,
  Link2,
  Type,
  RotateCcw,
  Droplet,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Self-contained accessibility toolbar (replaces the WordPress "נגישות" plugin
 * from the old site). A floating button opens a panel whose toggles apply
 * classes / a root font-size to <html>; the matching CSS lives in globals.css.
 * Preferences persist in localStorage so they survive navigation and reloads.
 */

const STORAGE_KEY = "kama-a11y";
const BASE_FONT_PX = 16;
/** Root font-size multipliers cycled by the A+/A- controls (100%–150%). */
const FONT_SCALES = [1, 1.1, 1.25, 1.5] as const;

type Settings = {
  fontLevel: number; // index into FONT_SCALES
  grayscale: boolean;
  invert: boolean;
  highlightLinks: boolean;
  readableFont: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  fontLevel: 0,
  grayscale: false,
  invert: false,
  highlightLinks: false,
  readableFont: false,
};

function readStoredSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function applySettings(settings: Settings): void {
  const root = document.documentElement;
  const scale = FONT_SCALES[settings.fontLevel] ?? 1;
  root.style.fontSize = scale === 1 ? "" : `${BASE_FONT_PX * scale}px`;
  root.classList.toggle("a11y-grayscale", settings.grayscale);
  root.classList.toggle("a11y-invert", settings.invert);
  root.classList.toggle("a11y-links", settings.highlightLinks);
  root.classList.toggle("a11y-readable", settings.readableFont);
}

export function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  // Lazy init reads saved prefs on the client; on the server localStorage is
  // absent and readStoredSettings falls back to defaults. The button/panel
  // markup is identical for any settings, so there's no hydration mismatch.
  const [settings, setSettings] = useState<Settings>(readStoredSettings);

  // Sync the DOM to the current settings — on mount (applying saved prefs) and
  // on every change. Updating an external system from state is the intended use
  // of an effect, and it calls no setState, so React 19's rules are satisfied.
  useEffect(() => {
    applySettings(settings);
  }, [settings]);

  // Functional updates compute from the latest state, so rapid successive
  // clicks accumulate instead of clobbering each other. Persistence lives here
  // (not in the sync effect) so we never write defaults the user never chose.
  const update = useCallback((transform: (prev: Settings) => Settings) => {
    setSettings((prev) => {
      const next = transform(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Private mode / storage disabled — settings still apply this session.
      }
      return next;
    });
  }, []);

  const changeFont = (direction: 1 | -1) =>
    update((prev) => ({
      ...prev,
      fontLevel: Math.min(
        FONT_SCALES.length - 1,
        Math.max(0, prev.fontLevel + direction),
      ),
    }));

  const toggle = (key: keyof Omit<Settings, "fontLevel">) =>
    update((prev) => ({ ...prev, [key]: !prev[key] }));

  const reset = () => update(() => DEFAULT_SETTINGS);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="פתיחת תפריט נגישות"
        aria-expanded={open}
        className="a11y-exempt fixed bottom-4 left-4 z-[60] flex size-13 items-center justify-center rounded-full bg-ink text-ink-foreground shadow-lg ring-2 ring-primary transition-colors hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-4"
      >
        <Accessibility className="size-7" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="תפריט נגישות"
          className="a11y-exempt fixed bottom-20 left-4 z-[60] w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card p-4 text-card-foreground shadow-xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">תפריט נגישות</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="סגירת תפריט נגישות"
              className="rounded-full p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="mb-3 flex items-center gap-2">
            <Type className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-sm">גודל טקסט</span>
            <div className="ms-auto flex gap-1">
              <button
                type="button"
                onClick={() => changeFont(-1)}
                disabled={settings.fontLevel === 0}
                aria-label="הקטנת טקסט"
                className="flex size-8 items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-40"
              >
                <Minus className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => changeFont(1)}
                disabled={settings.fontLevel === FONT_SCALES.length - 1}
                aria-label="הגדלת טקסט"
                className="flex size-8 items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-40"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <ToggleRow
              icon={<Contrast className="size-4" />}
              label="ניגודיות הפוכה"
              active={settings.invert}
              onClick={() => toggle("invert")}
            />
            <ToggleRow
              icon={<Droplet className="size-4" />}
              label="גווני אפור"
              active={settings.grayscale}
              onClick={() => toggle("grayscale")}
            />
            <ToggleRow
              icon={<Link2 className="size-4" />}
              label="הדגשת קישורים"
              active={settings.highlightLinks}
              onClick={() => toggle("highlightLinks")}
            />
            <ToggleRow
              icon={<Type className="size-4" />}
              label="גופן קריא"
              active={settings.readableFont}
              onClick={() => toggle("readableFont")}
            />
          </div>

          <button
            type="button"
            onClick={reset}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-border py-2 text-sm font-semibold hover:bg-muted"
          >
            <RotateCcw className="size-4" />
            איפוס הגדרות
          </button>

          <Link
            href="/accessibility"
            onClick={() => setOpen(false)}
            className="mt-3 block text-center text-sm text-muted-foreground underline hover:text-foreground"
          >
            הצהרת נגישות
          </Link>
        </div>
      )}
    </>
  );
}

function ToggleRow({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
        active
          ? "border-primary bg-primary/15 font-semibold"
          : "border-border hover:bg-muted",
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      {label}
    </button>
  );
}

"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { TurnstileWidget } from "@/components/security/turnstile-widget";
import { submitContactForm, type ContactFormState } from "./actions";

const INITIAL: ContactFormState = {};
const FIELD =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ContactForm() {
  const [state, formAction, pending] = useActionState(
    submitContactForm,
    INITIAL,
  );

  if (state.ok) {
    return (
      <div
        role="status"
        className="rounded-lg bg-primary/10 px-4 py-6 text-center text-ink"
      >
        <p className="text-lg font-semibold">קיבלנו את הפנייה שלך 🌿</p>
        <p className="mt-1 text-sm text-muted-foreground">
          נחזור אליך בהקדם בוואטסאפ. תודה שפנית לשבילי קמה!
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* Honeypot: hidden from humans; bots fill it and get silently dropped. */}
      <div aria-hidden="true" className="hidden">
        <label>
          חברה
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <label
          htmlFor="contact-name"
          className="mb-1 block text-sm font-medium text-ink"
        >
          שם מלא
        </label>
        <input
          id="contact-name"
          type="text"
          name="name"
          required
          autoComplete="name"
          className={FIELD}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="contact-phone"
            className="mb-1 block text-sm font-medium text-ink"
          >
            טלפון (וואטסאפ)
          </label>
          <input
            id="contact-phone"
            type="tel"
            name="phone"
            required
            autoComplete="tel"
            dir="ltr"
            placeholder="050-1234567"
            className={FIELD}
          />
        </div>
        <div>
          <label
            htmlFor="contact-email"
            className="mb-1 block text-sm font-medium text-ink"
          >
            אימייל
          </label>
          <input
            id="contact-email"
            type="email"
            name="email"
            required
            autoComplete="email"
            dir="ltr"
            className={FIELD}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="contact-message"
          className="mb-1 block text-sm font-medium text-ink"
        >
          במה נוכל לעזור?{" "}
          <span className="text-muted-foreground">(אופציונלי)</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={4}
          className={FIELD}
        />
      </div>

      <label className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm text-ink">
        <input
          type="checkbox"
          name="consent_whatsapp"
          required
          className="mt-1"
        />
        <span>בשליחת הטופס אני מאשר/ת יצירת קשר בוואטסאפ.</span>
      </label>

      <TurnstileWidget />

      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={pending}
      >
        {pending ? "שולחים…" : "שליחה"}
      </Button>
    </form>
  );
}

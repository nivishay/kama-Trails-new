"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Success panel for an admin-created booking (#32): shows the pay-link to send to the customer,
 * with a copy button. The link is a capability URL — the customer opens it to sign the consents
 * and pay in full.
 */
export function PayLinkResult({
  payLink,
  customerName,
}: {
  payLink: string;
  customerName?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(payLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
      <p className="text-sm font-medium text-ink">
        ההזמנה נוצרה{customerName ? ` עבור ${customerName}` : ""}. שלחו את קישור
        התשלום ללקוח:
      </p>
      <div className="mt-3 flex items-center gap-2">
        <input
          readOnly
          value={payLink}
          dir="ltr"
          className="flex-1 truncate rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink"
        />
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "הועתק" : "העתקה"}
        </button>
      </div>
    </div>
  );
}

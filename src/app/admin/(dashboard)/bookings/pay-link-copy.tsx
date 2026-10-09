"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

const COPIED_RESET_MS = 2000;

/**
 * Admin control to retrieve a held booking's pay-link at any time (issue #32): copy it to send
 * the customer, or open it to preview the customer's payment page. This is what makes the link
 * "saved for later" — it survives past the one-time creation panel (`PayLinkResult`).
 */
export function PayLinkCopy({ payLink }: { payLink: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(payLink);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-medium text-ink hover:bg-muted"
      >
        {copied ? (
          <Check className="size-3.5 text-primary" />
        ) : (
          <Copy className="size-3.5" />
        )}
        {copied ? "הועתק" : "קישור תשלום"}
      </button>
      <a
        href={payLink}
        target="_blank"
        rel="noopener noreferrer"
        title="פתיחת דף התשלום של הלקוח"
        className="inline-flex items-center text-muted-foreground hover:text-ink"
      >
        <ExternalLink className="size-3.5" />
      </a>
    </div>
  );
}

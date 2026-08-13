import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import {
  confirmPaymentFromSession,
  createBookingPaymentStore,
} from "@/lib/payments/webhook";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

// Cardcom server-to-server webhook. Privileged system path (#41): Node runtime, never cached,
// holds the service-role key. It confirms bookings — but only after pull-verifying the result
// (ADR 0002); the POST body is used ONLY to learn which session to verify.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pickSessionId(body: unknown): string | null {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const value =
      record.LowProfileId ?? record.lowProfileId ?? record.lowprofilecode;
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

/** Extract the Cardcom LowProfileId from the request (query, JSON, or form) — defensively. */
async function extractSessionId(request: Request): Promise<string | null> {
  const url = new URL(request.url);
  const fromQuery =
    url.searchParams.get("LowProfileId") ??
    url.searchParams.get("lowprofilecode");
  if (fromQuery) return fromQuery;

  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const form = await request.formData();
      const value = form.get("LowProfileId") ?? form.get("lowprofilecode");
      return value ? value.toString() : null;
    }
    const body = await request.json().catch(() => null);
    return pickSessionId(body);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const sessionId = await extractSessionId(request);
  if (!sessionId) {
    // Malformed ping — acknowledge so Cardcom doesn't retry it forever. Nothing to verify.
    return NextResponse.json(
      { ok: false, reason: "no-session-id" },
      { status: 200 },
    );
  }

  try {
    const outcome = await confirmPaymentFromSession({
      provider: getPaymentProvider(),
      store: createBookingPaymentStore(createSupabaseServiceClient()),
      sessionId,
    });

    if (outcome.kind === "rejected" || outcome.kind === "anomaly") {
      // Ops signal — booking id only, no PII.
      console.warn(`[cardcom-webhook] ${outcome.kind}`, { sessionId, outcome });
    }
    return NextResponse.json(
      { ok: true, outcome: outcome.kind },
      { status: 200 },
    );
  } catch (error) {
    // Unexpected failure — 500 so Cardcom retries; the confirm RPC is idempotent (#38).
    console.error("[cardcom-webhook] unexpected error", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

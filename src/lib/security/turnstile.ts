// Cloudflare Turnstile server-side verification (DECISIONS #51). Turnstile is the invisible bot
// gate on the public contact form; the widget produces a token, and this confirms it server-side
// before we spend any DB/WhatsApp work.

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verify a Turnstile token. When no secret is configured (local dev before keys exist) it
 * bypasses with a warning so dev isn't blocked — production MUST set TURNSTILE_SECRET_KEY
 * (docs/pre-launch-checklist.md). A missing token with a configured secret always fails.
 */
export async function verifyTurnstile(
  token: string | null,
  remoteIp?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn(
      "[turnstile] TURNSTILE_SECRET_KEY not set — bypassing verification (dev only).",
    );
    return true;
  }
  if (!token) return false;

  try {
    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", token);
    if (remoteIp) form.set("remoteip", remoteIp);

    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      body: form,
    });
    if (!response.ok) return false;

    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch (error) {
    console.error("[turnstile] verification error:", error);
    return false;
  }
}

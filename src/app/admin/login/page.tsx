"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mountain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError("האימייל או הסיסמה שגויים.");
      setSubmitting(false);
      return;
    }

    // Full navigation so middleware + the dashboard guard re-run with the new session.
    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Mountain className="size-8 text-primary" />
          <h1 className="text-xl font-bold text-ink">כניסת מנהל</h1>
          <p className="text-sm text-muted-foreground">שבילי קמה — ניהול</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-ink"
            >
              אימייל
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-ring"
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-ink"
            >
              סיסמה
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-ring"
              dir="ltr"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "מתחבר…" : "כניסה"}
          </Button>
        </form>
      </div>
    </div>
  );
}

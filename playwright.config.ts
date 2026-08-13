import { defineConfig, devices } from "@playwright/test";

// Flow (end-to-end) tests: the booking happy-path against a running app + local Supabase.
// The app is booted with PAYMENT_PROVIDER=fake so the payment step is deterministic (ADR 0003).
//
// Set E2E_BASE_URL to point at an already-running / deployed app (e.g. the Lane 2 sandbox against
// a public preview) — the local webServer is then skipped.
const PORT = 3000;
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Boot the built app locally; skip when targeting an external base URL.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run start",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});

import { defineConfig } from "vitest/config";

// Integration tests that talk to a real (local) Supabase stack over the network.
// Kept separate from the unit config (vitest.config.mts) so the default `npm test`
// never requires Docker. Run with: npm run test:integration (after `supabase start`).
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["test/**/*.integration.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});

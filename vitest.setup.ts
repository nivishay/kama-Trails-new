import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Deterministic Supabase config so modules that read these at import time work
// under test without a real .env. Real values (from .env) still take precedence.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "test-anon-key";

afterEach(() => {
  cleanup();
});

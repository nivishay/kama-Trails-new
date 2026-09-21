import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Reference material, not source: scraped old site, POC/design exports (generated third-party
    // bundles that trip lint — e.g. the Claude Design `_ds` bundle).
    "meetings_docs/**",
    // Scratch git worktrees (full repo copies); never our source to lint.
    ".claude/**",
  ]),
]);

export default eslintConfig;

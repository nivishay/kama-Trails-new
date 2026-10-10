import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FEE_3_TO_4_DAYS,
  FEE_5_TO_6_DAYS,
  FEE_FULL_REFUND,
} from "@/lib/admin/cancellation";

// The /cancellation-policy page renders this markdown verbatim. If the published fee tiers
// drift from the constants in computeCancellationCharge, a customer is refunded a different
// amount than the policy promises (pre-launch checklist / DECISIONS #13, #31). This test is
// the guard that keeps the page copy and the refund math quoting the same numbers.
const POLICY = readFileSync(
  join(process.cwd(), "src/content/legal/cancellation-policy.md"),
  "utf8",
);

/** True when `fee` is quoted as "<fee> ש"ח", not as a substring of a larger number (150 ⊃ 50). */
function quotesFee(markdown: string, fee: number): boolean {
  return new RegExp(`(?<![0-9])${fee} ש"ח`).test(markdown);
}

describe("cancellation-policy page copy matches the #13 fee constants", () => {
  it("quotes the 5–6 day fee", () => {
    expect(quotesFee(POLICY, FEE_5_TO_6_DAYS)).toBe(true);
  });

  it("quotes the 3–4 day fee", () => {
    expect(quotesFee(POLICY, FEE_3_TO_4_DAYS)).toBe(true);
  });

  it("states a full refund (no fee) for the earliest tier", () => {
    expect(FEE_FULL_REFUND).toBe(0);
    expect(POLICY).toContain("החזר מלא");
  });

  it("states full forfeit (no refund) within 48 hours", () => {
    expect(POLICY).toContain("48 שעות");
    expect(POLICY).toContain("ללא החזר");
  });
});

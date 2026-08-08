import { describe, expect, it } from "vitest";
import { formatPrice } from "./price";

describe("formatPrice", () => {
  it("formats a whole shekel amount with the ₪ suffix", () => {
    expect(formatPrice(180)).toBe("180 ₪");
  });

  it("rounds non-integer amounts", () => {
    expect(formatPrice(199.5)).toBe("200 ₪");
  });

  it("handles zero", () => {
    expect(formatPrice(0)).toBe("0 ₪");
  });
});

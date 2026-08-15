import { describe, expect, it } from "vitest";
import { normalizeIsraeliMobile } from "./phone";

describe("normalizeIsraeliMobile", () => {
  it("normalizes a local Israeli mobile to E.164 digits (no plus)", () => {
    expect(normalizeIsraeliMobile("050-7654321")).toEqual({
      e164: "972507654321",
    });
  });

  it("accepts common local formats and spacing", () => {
    expect(normalizeIsraeliMobile("054 765 4321")?.e164).toBe("972547654321");
    expect(normalizeIsraeliMobile("0527654321")?.e164).toBe("972527654321");
  });

  it("accepts international input", () => {
    expect(normalizeIsraeliMobile("+972 54 765 4321")?.e164).toBe(
      "972547654321",
    );
  });

  it("rejects an Israeli landline (WhatsApp needs a mobile)", () => {
    expect(normalizeIsraeliMobile("03-6291200")).toBeNull();
  });

  it("rejects garbage, too-short, and unassigned ranges", () => {
    expect(normalizeIsraeliMobile("not a phone")).toBeNull();
    expect(normalizeIsraeliMobile("12345")).toBeNull();
    expect(normalizeIsraeliMobile("")).toBeNull();
  });
});

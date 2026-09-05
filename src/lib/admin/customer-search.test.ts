import { describe, it, expect } from "vitest";
import {
  normalizePhoneIl,
  sanitizeSearchTerm,
  buildCustomerSearchOr,
  countHistoryByCustomer,
} from "./customer-search";

describe("normalizePhoneIl", () => {
  it("turns a leading 0 into the 972 country prefix", () => {
    expect(normalizePhoneIl("050-123-4567")).toBe("972501234567");
  });

  it("strips non-digits and keeps an already-normalized number", () => {
    expect(normalizePhoneIl("+972 50 1234567")).toBe("972501234567");
  });

  it("returns an empty string when there are no digits", () => {
    expect(normalizePhoneIl("abc")).toBe("");
  });
});

describe("sanitizeSearchTerm", () => {
  it("removes PostgREST filter metacharacters", () => {
    expect(sanitizeSearchTerm("a,b(c)*d%e\\f")).toBe("a b c  d e f".trim());
  });

  it("keeps Hebrew, digits and email punctuation", () => {
    expect(sanitizeSearchTerm("  דנה test@example.com 050  ")).toBe(
      "דנה test@example.com 050",
    );
  });
});

describe("buildCustomerSearchOr", () => {
  it("returns null for an empty or whitespace query", () => {
    expect(buildCustomerSearchOr("")).toBeNull();
    expect(buildCustomerSearchOr("   ")).toBeNull();
  });

  it("searches name, email and both phone forms for a numeric query", () => {
    const or = buildCustomerSearchOr("0501234567");
    expect(or).toContain("full_name.ilike.%0501234567%");
    expect(or).toContain("email.ilike.%0501234567%");
    expect(or).toContain("phone.ilike.%0501234567%");
    expect(or).toContain("phone_key.ilike.%972501234567%");
  });

  it("omits the phone_key clause for a non-numeric query", () => {
    const or = buildCustomerSearchOr("דנה");
    expect(or).not.toContain("phone_key");
    expect(or).toContain("full_name.ilike.%דנה%");
  });

  it("does not let a comma injection break the filter", () => {
    const or = buildCustomerSearchOr("a,email.ilike.x");
    // The comma is neutralized so the term stays a single ilike value, not extra clauses.
    expect(or).toBe(
      "full_name.ilike.%a email.ilike.x%,email.ilike.%a email.ilike.x%,phone.ilike.%a email.ilike.x%",
    );
  });
});

describe("countHistoryByCustomer", () => {
  it("counts bookings and leads per customer and ignores null ids", () => {
    const counts = countHistoryByCustomer(
      [{ customer_id: "a" }, { customer_id: "a" }, { customer_id: null }],
      [{ customer_id: "a" }, { customer_id: "b" }],
    );
    expect(counts.get("a")).toEqual({ bookings: 2, leads: 1 });
    expect(counts.get("b")).toEqual({ bookings: 0, leads: 1 });
    expect(counts.has("null")).toBe(false);
  });

  it("returns an empty map for no history", () => {
    expect(countHistoryByCustomer([], []).size).toBe(0);
  });
});

import { test, expect } from "@playwright/test";

// The crown-jewel customer journey: browse a trail, register for a date, "pay" (fake provider),
// and land on a confirmed booking. Booking UI + the checkout→confirm path are exercised end to
// end; only the external Cardcom call is faked (ADR 0003). Seed: trail "nahal-kziv" with one open
// departure three weeks out (supabase/seed.sql), so the date is always bookable.
const TRAIL_SLUG = "nahal-kziv";
const TRAIL_NAME = "שביל נחל כזיב";

test("a visitor books a trail date and reaches a confirmed booking", async ({
  page,
}) => {
  await page.goto(`/trails/${TRAIL_SLUG}`);
  await expect(page.getByRole("heading", { name: TRAIL_NAME })).toBeVisible();

  // Enter checkout for the first available date.
  await page.getByRole("link", { name: "הרשמה לתאריך זה" }).first().click();
  await expect(page).toHaveURL(/\/checkout\?departure=/);

  // Fill the registration form (participants defaults to 1).
  await page.locator('input[name="registrant_name"]').fill("בודק אוטומטי");
  await page.locator('input[name="phone"]').fill("050-0000000");
  await page.locator('input[name="email"]').fill("e2e@example.com");
  // Both consents are mandatory (#31): the cancellation policy and the risk waiver.
  for (const consent of await page.getByRole("checkbox").all()) {
    await consent.check();
  }

  await page.getByRole("button", { name: "המשך לתשלום" }).click();

  // Fake provider → fake-complete route confirms → success page flips to confirmed.
  await expect(
    page.getByRole("heading", { name: "ההרשמה אושרה!" }),
  ).toBeVisible({ timeout: 15_000 });
});

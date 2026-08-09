# Kama Trails — Pre-Launch Checklist

Living checklist of everything that must be verified or done **before shipping the
real website** (public launch on `https://kamatrails.co.il`). See
[CLAUDE.md](../CLAUDE.md) for coding rules and [DECISIONS.md](../DECISIONS.md) for
locked decisions.

**How to use this file (rule for every agent):** whenever you defer something to
launch — a temporary shortcut, a `// TODO before ship`, a setting that's fine for
dev but wrong for production, a manual step, or a check that only matters live —
**add a line here** in the right section. Link the commit/PR and the file:line it
lives in. Nothing that blocks a real launch should live only in someone's memory or
a code comment. Tick items with `[x]` as they're done; don't delete them (the
history is the audit trail).

Status legend: `[ ]` open · `[x]` done · `[~]` in progress / partial.

---

## Booking & reservations correctness

- [ ] **Add `revalidatePath("/trails")` + `revalidatePath("/trails/[slug]")` on
  booking events** when booking goes live. The catalog is ISR-cached with
  `revalidate = 60` (see `src/app/trails/page.tsx`, `src/app/trails/[slug]/page.tsx`),
  so without on-demand revalidation a filled/cancelled departure can look stale for
  up to 60s. Overbooking is already impossible (the reservation path re-checks the DB
  at booking time) — this is a freshness/UX item, not a safety one.
  _Deferred in PR: ISR caching for the trails catalog._
- [ ] Verify the seat-hold expiry (~15 min, DECISIONS #6) actually releases holds and
  frees capacity in production (cron/edge function scheduled and running).
- [ ] End-to-end test a real deposit payment against the **live** payment provider
  (not sandbox) before opening booking to the public.

## SEO & domain cutover (FINAL phase — see DECISIONS #3, #28)

- [ ] URL structure mirrors the old site or a 1:1 redirect map is in place
  (`meetings_docs/scrape_old.txt`) — no lost link equity on cutover.
- [ ] `sitemap.xml` + `robots.txt` generated and correct.
- [ ] Per-page metadata (title/description) and canonical URLs on every public route.
- [ ] Trail images have alt text (`trail_images` + alt, DECISIONS #28).
- [ ] Redirects verified for every old URL before DNS cutover to `kamatrails.co.il`.

## Performance

- [ ] Confirm all public routes are static/ISR (not `ƒ` dynamic) in `next build`
  output — dynamic renders on public pages are almost always a caching bug.
- [ ] Review `next.config.ts` `images.deviceSizes` — defaults generate variants up to
  3840px for source images that are ~768px wide (wasted bytes). Cap to sensible sizes.

## Security & data

- [ ] RLS reviewed on every table (run `schema-checker`); anon key can only read what's
  intended and write nothing it shouldn't.
- [ ] No secrets in the repo or client bundle; production env vars set in the host.
- [ ] Customer PII (name/phone/email) is stored/logged only where needed.

## Operational readiness

- [ ] Error monitoring / logging wired for production.
- [ ] DB backups configured and a restore tested.
- [ ] Custom 404 / error pages in Hebrew RTL.
- [ ] Analytics installed (as decided).

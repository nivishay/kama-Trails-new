# Kama Trails — Coding Rules

> **⭐ NORTH STAR (read first — applies to every agent).**
> 1. **The base44 POC is what we follow.** It is the product/design reference we aim
>    for right now — match its flows, pages, and UX. It is *not* the codebase
>    (we build custom Next.js + Supabase); it *is* the target.
> 2. **Protect the SEO of the live site.** At the **end** of the project we cut over to
>    the **existing domain `https://kamatrails.co.il`** to preserve its search ranking.
>    So keep the **real Kama site URLs close**: mirror the old URL structure (Hebrew
>    slugs like `/אודות/`, `/trails-in-north/`, `/comming-soon-trails/`, …) or keep a
>    1:1 redirect map, so migration is a clean cutover with no lost link equity.
>    The old site's full URL/content map is in `meetings_docs/scrape_old.txt`.
> 3. **Sequencing:** SEO + URL migration + domain cutover is the **FINAL phase**
>    (after v1 works) — but every route/slug decision made *before* then must not
>    paint us into a corner. See `DECISIONS.md` #3 and #28. When choosing a route,
>    ask: "does this map cleanly to the old URL, or need a redirect?"
>
> **Reference sources — what we're aiming at (keep these close):**
> - **POC (design/UX target):** base44 POC — URL in `meetings_docs/POC.txt`
>   (`https://kama-trail-book.base44.app/`). Match its flows, pages, and UX.
> - **Old live site (SEO cutover target):** `https://kamatrails.co.il` — full
>   URL/content map scraped in `meetings_docs/scrape_old.txt`. Mirror its URL
>   structure so the final domain cutover preserves search ranking.

**Pre-launch checklist (rule).** Whenever you defer anything to the real launch —
a temporary shortcut, a dev-only setting that's wrong for production, a manual step,
a `// TODO before ship`, or a check that only matters live — **record it in
[`docs/pre-launch-checklist.md`](docs/pre-launch-checklist.md)** under the right
section, linking the file:line and PR. That file is the single accumulating list of
what must be verified before shipping to `kamatrails.co.il`; nothing launch-blocking
should live only in a code comment or memory.

Goal: clean, clear, tested, modular code. Tech-agnostic until stack is chosen
(then add a short "Stack & Tooling" line: language, test runner, linter, formatter).

**Stack & Tooling:** TypeScript · Next.js 16 (App Router, `src/`, alias `@/*`) ·
Tailwind CSS v4 + shadcn-style UI (`src/components/ui`) · Supabase (Postgres + Auth
+ Storage) via `@supabase/ssr` · Vitest + React Testing Library · ESLint
(`eslint-config-next`) + Prettier. Hebrew-only RTL. Run: `npm run dev` / `build` /
`lint` / `test`.

**Clarity**
- Descriptive names for vars/functions/files; no vague `data`/`temp`/`util`, no 1-letter names (except loop indices).
- No magic values — use named constants.
- Prefer clear over clever; if a one-liner needs a comment, write the obvious version.

**Comments**
- Comment the *why*, not the *what*. No commented-out code. Keep comments truthful.

**Functions**
- Short & focused: aim < 50 lines, ~100 = smell. One job, one abstraction level.
- ≤ 3 params (else pass an options object). Guard clauses / early return; max ~2–3 nesting levels.
- No hidden side effects; separate compute (query) from act (command).

**Modularity**
- Small cohesive modules, one responsibility each.
- Separate layers: business logic vs I/O (net/DB/files) vs UI. Logic must not depend on framework/transport.
- Isolate external services behind thin interfaces. Inject dependencies (no globals/singletons).
- No copy-paste — but prefer a little duplication over the wrong abstraction.

**Edge cases & errors**
- Handle explicitly: empty, null/undefined, zero/negative, huge input, duplicates, boundaries, wrong types.
- Validate/sanitize input at boundaries (user, API, scraped data, forms).
- Fail loudly and early. No empty catch blocks. Error messages give actionable context (never leak secrets/PII).

**Testing**
- Tests for every non-trivial unit; bug fix ships with a regression test (fails before, passes after).
- Levels distinct: unit (mocked deps), integration, e2e. Cover edge cases, not just happy path.
- Arrange–Act–Assert, one behavior per test, behavior-named. Deterministic & independent (mock net/time/state).
- Test behavior, not implementation.

**CI coverage (rule).** When you build & test a piece that's *worth guarding in CI*,
make sure a GitHub Action actually runs its tests — **extend the existing ladder in
[`.github/workflows/ci.yml`](.github/workflows/ci.yml)** (see ADR 0003), don't fork
one-off workflow files.
- *Worth a GHA when* the piece has automated tests that a teammate could break from
  an unrelated change: a new **test level or runner** (a `test:*` npm script no job
  runs yet), a new **external dependency** the suite needs (DB, browser, service,
  secret/env), or a **critical flow** (booking, payments, auth) whose regression must
  block merge. A pure refactor already covered by an existing job needs nothing new.
- *Best practice for the job:* pin actions to a major (`@v4`) and Node to `NODE_VERSION`;
  `npm ci` (never `install`) with `cache: npm`; put cheap gates (`lint`, `tsc`, unit)
  first and gate the expensive DB/e2e jobs behind them via `needs:`; keep it
  **deterministic** (fake/seed external providers — e.g. `PAYMENT_PROVIDER: fake` —
  pin time/random, no live network); `permissions:` least-privilege and secrets via
  `secrets.*`, never inline; tear down services with `if: always()` and upload
  artifacts (Playwright report, logs) `if: failure()` for triage; keep the job fast and
  cancel superseded runs (`concurrency:` + `cancel-in-progress`).
- If a piece *should* be covered but you're deferring the CI wiring, log it in
  [`docs/pre-launch-checklist.md`](docs/pre-launch-checklist.md) rather than leaving it
  silent.

**Hygiene**
- Match surrounding code style. Linter/formatter are the source of truth (pass before commit).
- Remove dead code/unused imports. Small focused commits explaining the *why*.

**Security**
- No hardcoded secrets (use env/config). Protect customer PII (names/phones/emails) — log/store only what's needed.
- Sanitize anything shown to users (XSS/SQL/injection).

**Done =** clear & well-named · small single-purpose functions · edge cases handled · tests (incl. edge) pass · linter clean · no secrets/dead code.

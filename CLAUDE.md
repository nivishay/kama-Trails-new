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

Goal: clean, clear, tested, modular code. Tech-agnostic until stack is chosen
(then add a short "Stack & Tooling" line: language, test runner, linter, formatter).

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

**Hygiene**
- Match surrounding code style. Linter/formatter are the source of truth (pass before commit).
- Remove dead code/unused imports. Small focused commits explaining the *why*.

**Security**
- No hardcoded secrets (use env/config). Protect customer PII (names/phones/emails) — log/store only what's needed.
- Sanitize anything shown to users (XSS/SQL/injection).

**Done =** clear & well-named · small single-purpose functions · edge cases handled · tests (incl. edge) pass · linter clean · no secrets/dead code.

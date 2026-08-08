# Kama Trails — Coding Rules

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

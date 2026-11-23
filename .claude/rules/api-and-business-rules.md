---
paths:
  - "app/api/**"
  - "lib/**"
---

<!-- owner: @oksanastrohetska · why: Keep API status codes and task business rules consistent and covered by tests · review-by: 2026-12-01 -->

# API and business-rule conventions

1. Business rules (title 1..120, estimate 1..40 h, `todo → doing → done`, done is final) live only in `lib/tasks.ts`; route handlers in `app/api/` must not duplicate them.
2. Route handlers validate input shape and return `400`; a `RuleViolation` from `lib/` maps to `422`; do not leak stack traces.
3. Use `db()` from `lib/db.ts`; never open SQLite files directly in handlers.
4. Any change to a rule or endpoint needs a test in `lib/tasks.test.ts` covering the success path and the failure path.
5. Schema changes go through a new migration (skill `add-migration`), never by editing an existing one.

**Completion check:** `npm test` and `npm run typecheck` pass.

---
paths:
  - "db/migrations/**"
---
<!-- owner: @edvardino · why: lib/db.ts tracks migrations by file name only, so editing an applied file never re-runs it and existing DBs drift from the repo silently · review-by: 2027-03-01 -->

# Migrations

- Applied migrations are immutable. To change the schema, add the next `NNN_snake_case.sql` (zero-padded, one past the highest number).
- One schema change per file. Use `alter table ... add column`; no destructive `drop` without a human's explicit OK.
- Enum-like columns get a `check (... in (...))` constraint, as in `001`. New columns must be nullable or have a default, so existing rows stay valid.
- Mirror the change in `lib/tasks.ts` (type, insert, `toTask`) and add a test in `lib/tasks.test.ts` in the same PR.
- Verify: `npm run db:reset && npm test`. Put a one-line rollback note in the PR (SQLite: a new migration that reverses it).
- Follow the `add-migration` skill for the full procedure.

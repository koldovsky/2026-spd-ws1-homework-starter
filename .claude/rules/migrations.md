---
paths:
  - "db/migrations/**"
---
<!-- owner: @flatdeh · why: editing an applied migration silently diverges existing DBs from fresh ones · review-by: 2027-03-01 -->

# SQL migrations

- Files are `NNN_snake_case.sql`, applied in filename order by `lib/db.ts`. Next number = highest + 1, zero-padded to 3.
- Never edit or rename an existing file; write a new migration (`alter table ...`). The `protect-migrations` hook enforces this.
- SQLite: keep `check` constraints in step with the rules in `lib/tasks.ts` (title 1..120, estimate 1..40).
- New columns must be nullable or have a default, so old rows stay valid.
- Verify on a fresh DB: `npm test` (tests open `:memory:` and run all migrations).

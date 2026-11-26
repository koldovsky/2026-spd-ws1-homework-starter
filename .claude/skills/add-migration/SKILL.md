---
name: add-migration
description: Add a new SQLite schema migration to db/migrations and wire it through lib/tasks.ts with a test. Use when the schema needs a new column, table or constraint.
---
<!-- owner: @flatdeh · why: schema changes were the riskiest repeated task and applied migrations must never be edited · review-by: 2027-03-01 -->

# Add a migration

1. `ls db/migrations` — take the highest number, add 1 (3 digits). Never touch existing files.
2. Create `db/migrations/NNN_<verb>_<what>.sql` with a single `alter table` / `create table`.
   New columns: nullable or with a default. Mirror business limits as `check` constraints.
3. Update `lib/tasks.ts`: the `Task` type, `toTask`, and the validation in `createTask` if input changes.
4. Update `app/api/**` only if the request/response shape changes (keep 400 vs 422 semantics).
5. Add tests in `lib/tasks.test.ts`: the happy path, and each new limit (just inside, just outside).
6. Check: `npm test && npm run typecheck`. Both must exit 0.
7. Report in the PR: the migration filename, and how to roll back (a new migration — never edit the old one).

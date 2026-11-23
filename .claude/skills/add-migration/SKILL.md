---
name: add-migration
description: Add a new numbered SQLite migration to db/migrations and verify it applies on a fresh database. Use for any schema change.
---

<!-- owner: @oksanastrohetska-lab · why: Schema changes must be new migrations, never edits to applied ones; make that repeatable · review-by: 2027-04-23 -->

# Add a database migration

## Procedure

1. List `db/migrations/` and pick the next number with the same zero-padded format (e.g. `003_<short_snake_case>.sql`). Never edit or rename an existing file.
2. Write the new file with plain SQL, e.g. `alter table tasks add column ...`. Keep it additive; if a column needs a CHECK, mirror the rules in `lib/tasks.ts`.
3. Update `lib/tasks.ts` (and `app/api/**` if the API changes) to use the new column.
4. Add or update tests in `lib/tasks.test.ts`. Tests use `openDb(":memory:")`, so they apply all migrations from scratch.
5. Run `npm run db:reset`, then `npm test` and `npm run typecheck`.
6. Run `git status` and confirm only the new migration and intended code/test files changed; nothing in existing `db/migrations/*.sql`.
7. Report the migration name, checks run with PASS / FAIL, and how to recover (a follow-up migration, since SQLite migrations here have no down step).

## Completion check

- New file only in `db/migrations/`; existing migrations untouched.
- `npm test` and `npm run typecheck` pass on a fresh database.
- If a check cannot be run, report it as **not verified**.

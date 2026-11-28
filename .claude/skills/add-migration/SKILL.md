---
name: add-migration
description: Add a new SQL migration to db/migrations/ without editing an applied one. Use whenever the task changes the database schema or a table constraint.
---
<!-- owner: @vitalii-liashenko · why: the team repeats this procedure for every schema change, and skipping a step breaks databases that already ran earlier migrations · review-by: 2027-02-23 -->

# Add a migration

Follow the steps in order. Stop and report if a check fails; do not work around it.

1. **Read the current state.** List `db/migrations/` and note the highest number. Read `lib/db.ts` only if the change touches how migrations run.
2. **Pick the next number.** Use the next free three-digit prefix (e.g. `003_`). Never reuse or renumber a file.
3. **Name the file** `db/migrations/NNN_short_snake_case_name.sql`. Start it with a comment that says what changes and why.
4. **Write one logical change.** For a column, use `alter table tasks add column ...`. Constraints must match the domain rules in `lib/tasks.ts`: read the current limits there, do not use numbers from memory or docs.
5. **Do not touch existing migrations.** If the change looks like it needs an edit to an old file, stop and report it instead.
6. **Check.** Run:
   - `npm test`. Every test opens `openDb(":memory:")`, so this applies all migrations to a fresh DB. It must be green.
   - `npm run typecheck`. Must be green.
   - `npm run db:reset`, then `npm run dev` once, then stop it. The app must start without a migration error.
7. **Write the PR note.** Include the rollback: SQLite has no down-migration here, so say how to undo the change by hand or that it is additive and safe to leave in place.

**Done when:** the new file is the only change under `db/migrations/`, all three checks in step 6 passed, and the PR body has the rollback note.

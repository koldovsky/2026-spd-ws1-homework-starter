---
name: add-migration
description: Change the database schema by adding a new numbered SQL migration (never edit an existing one). Use whenever the user asks to add, change or remove a column, table, index or constraint, or to change the DB schema or a field's limits (додати колонку, змінити схему БД, міграція).
---
<!-- owner: @e5d3e1 · why: schema changes were the riskiest repeated task; applied migrations are immutable (see protect-migrations hook), so every change must be a new file · review-by: 2027-02-24 -->

# Add a migration

Existing files in `db/migrations/` are applied and immutable; a hook blocks edits to them. A schema change is always a **new** file.

## Steps

1. List `db/migrations/` and read the latest file and the ones touching the same table, to know the current schema.
2. Create `db/migrations/NNN_<snake_case_name>.sql`, where `NNN` is the next number, zero-padded to 3 digits.
   Files are applied in file-name order by `lib/db.ts`, so a wrong number changes the order.
3. Write plain SQL. SQLite cannot `ALTER` a `CHECK` constraint: to change one, rebuild the table
   (create `<table>_new`, copy rows, drop the old table, rename). Carry over every column from earlier migrations.
4. If the change affects a business rule (limits, statuses), update `lib/tasks.ts` and add a test in
   `lib/tasks.test.ts` for both sides of the new boundary. Update the numbers quoted in `AGENTS.md` if they changed.
5. Verify on a fresh database:
   - `npm test` — every test opens an empty in-memory DB and applies all migrations in order; this is the fresh-DB check.
   - `npm run typecheck`
   - Only to try the change in the running app: `npm run db:reset` (deletes `data/tasks.db`, asks for approval), then `npm run dev`.

## Check (done = all true)

- The new file is the only change under `db/migrations/`; no existing migration is modified.
- `npm test` and `npm run typecheck` are green.
- The PR description says what the migration does and how to roll it back (a reverse migration or "none, destructive").

## Do not

- Edit or rename an existing migration, even for a typo.
- Delete rows or drop columns without saying so in the PR description.

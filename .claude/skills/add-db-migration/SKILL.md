---
name: add-db-migration
description: Add a schema change to the Team Tasks SQLite database as a new numbered migration in db/migrations/. Use when a task needs a new table, column, index or constraint. Never edit an applied migration.
---
<!-- owner: @AlexSylka · why: schema changes were the riskiest repeated task; editing an applied migration silently diverges existing databases, because lib/db.ts skips files already recorded in schema_migrations · review-by: 2027-02-22 -->

# Add a DB migration

Applied migrations are immutable. `lib/db.ts` runs `db/migrations/*.sql` in file-name order and skips names already
recorded in `schema_migrations`, so an edited old file never reaches databases that have it. Change the schema with a **new file**.
The `PreToolUse` hook blocks changes to committed migrations; your new file stays editable until you commit it.

## Steps

1. **Create `db/migrations/NNN_<snake_case_description>.sql`.** `NNN` is the highest existing number plus 1,
   zero-padded to 3 digits; never reuse or renumber. One logical change per file, plain SQLite SQL, in the
   constraint style of the existing files (`check (...)`, `not null default ...`). A `not null` column needs a `default`,
   because existing rows must stay valid. SQLite cannot change a `check` constraint or a column type in place: rebuild
   the table (`create table tasks_new`, `insert into tasks_new (<every column>) select <every column> from tasks`,
   `drop table tasks`, `alter table tasks_new rename to tasks`). Name the columns on both sides, never `select *`
   (column order differs from the original table), and keep every existing column, type and constraint.
2. **Update the code that depends on it.** Types and queries in `lib/tasks.ts`; business rules stay there, not in
   routes. If the API changes, follow `.claude/rules/api-routes.md`.
3. **Add or adjust a test** in `lib/tasks.test.ts` that fails without the migration and passes with it.
4. **Add an upgrade test.** `npm test` starts from an empty database, so it cannot see a migration that breaks on
   existing rows. In the test, open `new DatabaseSync(":memory:")`, run every migration file *before* yours in order
   (read them from `db/migrations/`), insert a task, then run yours and check the task is still there with the same
   values. A real `data/tasks.db` is never touched.
5. **Check:** `npm test` and `npm run typecheck`.
6. **Write the rollback note.** SQLite has no automatic down-migration, so state the SQL that reverses it (for example
   `alter table tasks drop column <name>`; a table rebuild is reversed by a second rebuild), or say plainly that it
   can't be reversed. Put it in the PR description, and in your final reply to the user.

## Done when

- `git status --short db/migrations/` and `git diff --name-status origin/main...HEAD -- db/migrations/` show only
  new (`A` / `??`) files; nothing existing is modified, renamed or deleted.
- `npm test` (including the upgrade test) and `npm run typecheck` pass.
- Your final reply contains the rollback SQL, or says the change can't be reversed.
- Autonomy level for this change is L2 (see `docs/ai/team-agreement.md`): ask for a line-by-line review.

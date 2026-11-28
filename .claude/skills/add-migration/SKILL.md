---
name: add-migration
description: Add a database change to Team Tasks (new column, table, index or constraint) as a new numbered file in db/migrations/, with matching changes in lib/tasks.ts and a test. Use whenever a task needs a new stored field or a schema change (priority, due date, labels), even if the user does not say "migration".
---
<!-- owner: @AlexGLT · why: a schema change touches five places in a fixed order, and a miss breaks the app quietly · review-by: 2027-04-24 -->

# Add a migration

Copy the pattern of migration 002. Run commands from the repo root.

An applied migration is final. `openDb` records each file name in `schema_migrations`, so an edit makes old and new databases differ. Fix a mistake with a new migration. The hook `.claude/hooks/block-applied-migrations.mjs` blocks edits to old files. If it blocks you, do not bypass it with Bash.

## Steps

1. **Name.** Take the highest number in `db/migrations/`, add 1, pad to 3 digits: `003_add_task_priority.sql`.

2. **SQL.** Lowercase, constraints inline, as in 001 and 002.
   - New column: `alter table tasks add column ...`. A `not null` column needs a `default`.
   - A change `alter` cannot do (add `not null` to an existing column, change a type or constraint): rebuild the table. Create `tasks_new`, copy rows, drop `tasks`, rename. Comment what old rows get.
   - More than one statement: wrap in `begin;` and `commit;`. A failure halfway otherwise leaves half a change, and the next start fails again.
   - No `down` file. Undo with a new migration.

3. **Test first.** Add cases to `lib/tasks.test.ts` for the new field and each rule. Tests use `openDb(":memory:")`, which applies all migrations. Run `npm test` and confirm the new cases fail. If the migration changes existing rows, also test an upgrade: apply 001 and 002, insert a row, apply the new file.

4. **Code.**
   - `lib/tasks.ts`, `Task`: camelCase field. Use a union type for fixed values.
   - `lib/tasks.ts`, `toTask`: map `snake_case`. Use `== null` for nullable values.
   - `lib/tasks.ts`, `createTask`: input type, validation, insert. Throw `RuleViolation` for a bad value, so the caller gets 422 and not a raw SQLite error.
   - The route that accepts the field: a wrong type, or a value outside a fixed list, returns 400 (`.claude/rules/api-routes.md`). Range, length and date rules stay in `lib/`.

5. **Check.** `npm test` and `npm run typecheck` must pass.

6. **Report.** Name the new file and the other changed files. Give the test and typecheck results. Say what you skipped.

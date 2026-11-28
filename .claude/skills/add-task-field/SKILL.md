---
name: add-task-field
description: Add a new field (column) to tasks end to end, or change a limit on an existing field — new migration, business rule in lib/tasks.ts, API pass-through, tests. Use when asked to add/change a task property such as priority, due date, labels, or estimate limits.
---

<!-- owner: @skindyk · why: we have done this repeatedly (002 added estimate_hours) and the usual mistakes are editing an applied migration and forgetting the SQL/TS limit sync · review-by: 2027-03-01 -->

# Add or change a task field

Worked example already in the repo: `db/migrations/002_add_task_estimate.sql` + `estimateHours` in `lib/tasks.ts`.

## Steps

1. **Pick the next migration number.** List `db/migrations/`; the new file is `NNN_<verb>_<what>.sql` with
   `NNN` = highest + 1 (e.g. `003_add_task_priority.sql`). Never edit an existing migration file.
2. **Tests first, in `lib/tasks.test.ts`.** At minimum: a valid value is stored and returned; each bound (lowest
   valid, highest valid, one below, one above) — out-of-range throws `RuleViolation`; omitted value gives the
   default/null. If the database enforces it, one test that a direct `insert` with a bad value fails.
   For a table rebuild, an upgrade test: create a file DB, run the earlier migrations' SQL by hand and record them in
   `schema_migrations`, insert rows, then `openDb(file)` — rows and ids survive, the new limit holds.
3. **Red.** Run `npm test`. The new tests must **fail** for the right reason (the limit, not a typo). Keep the
   failing output for the report — it is the evidence for AGENTS.md rule 3. A test that passes now proves nothing.
4. **Write the migration.**
   - New column: `alter table tasks add column <snake_name> <type> [default …] check (…);`
   - Changing a `check` on an existing column: SQLite cannot alter constraints — rebuild the table in the new
     migration, inside `begin; … commit;`: `create table tasks_new (…full definition…)`, `insert into tasks_new
     (…all columns…) select … from tasks`, carry the `sqlite_sequence` counter over from `tasks` to `tasks_new` (so
     ids of deleted tasks are not reused), `drop table tasks`, `alter table tasks_new rename to tasks`.
     Keep every existing column and constraint.
5. **Business rule in `lib/tasks.ts`.**
   - Add the camelCase property to `Task` and map it in `toTask` (`row.<snake_name>`).
   - Accept it in `createTask` input, validate with the **same bounds as the SQL `check`**, throw `RuleViolation`
     with a message like `"<field> must be …"`, include it in the `insert`.
6. **API.** Routes pass the body through to `createTask`; only add a shape check (400) if the type is wrong.
   Follow `.claude/rules/api-routes.md`.
7. **Docs.** If a documented rule changed, update its line in `README.md` (the `lib/tasks.ts` row lists the limits).
   This is in scope (AGENTS.md rule 5); nothing else in the README is.

## Check (all must pass before reporting done)

Tests open `openDb(":memory:")`, so every `npm test` applies all migrations to a fresh DB — no `db:reset` needed
(it is `ask` in settings because it deletes the local dev DB; only run it if the user wants their local DB rebuilt).

```bash
npm test
npm run typecheck
git status --short -- db/migrations   # must show only the NEW file (??), never " M" on an existing one
```

Report: the migration file name, the rule and its bounds, the tests added, the **red** output from step 3, and the
output of the commands above (green).

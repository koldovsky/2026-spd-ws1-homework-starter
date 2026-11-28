---
name: new-migration
description: Add a new SQLite migration to db/migrations/ and wire the new schema into lib/tasks.ts with a test. Use when a task needs a schema change (new column, table, index or constraint). Never use it to edit an existing migration.
---

<!-- owner: @artem-tkachenko · why: applied migrations must never be edited (lib/db.ts skips them by name), so every schema change has to follow the same add-a-new-file procedure · review-by: 2027-05-23 -->

# New migration

Schema changes are always a **new** file. Editing an existing `db/migrations/*.sql` is blocked by the
`protect-migrations` hook (autonomy level L0). Creating a new one asks the developer first (`ask` in `.claude/settings.json`);
only @artem-tkachenko signs off.

## Steps

1. **Agree on the change.** Tell the developer in one or two sentences what the schema change is and why. Wait for a yes.
2. **Pick the next number.** List `db/migrations/`, take the highest `NNN` and add 1. Name the file
   `NNN_<verb>_<what>.sql` in snake_case, e.g. `003_add_task_priority.sql`. `lib/db.ts` applies files in name order,
   so the number must be three digits and unique.
3. **Write the SQL** in the style of `002_add_task_estimate.sql`: lowercase keywords, one statement per change.
   - SQLite `alter table ... add column` cannot add a `not null` column without a `default`; existing rows would break.
   - Put value limits in a `check (...)` constraint, as `estimate_hours between 1 and 40` does.
4. **Wire it into the code** if a column was added: the `Task` interface and `toTask()` in `lib/tasks.ts`
   (snake_case column → camelCase field), and the insert/update in the functions that write it.
   Mirror every `check` as a `RuleViolation` in `lib/tasks.ts`, so the API returns `422` instead of a database error.
5. **Add tests** in `lib/tasks.test.ts`: one for a valid value, one per rejected value.
6. **Run the checks** (do not run `npm run dev` or `npm start` — they apply the migration to the real `data/tasks.db`):
   - `npm test` — `openDb(":memory:")` applies every migration from scratch, so a broken SQL file fails here;
   - `npm run typecheck`.
7. **Hand over for review.** Show the developer the new `.sql` file and the `lib/` diff. Do not commit.

## Check (all must be true)

- [ ] Exactly one new file in `db/migrations/`; `git diff --stat -- db/migrations` shows no change to existing files.
- [ ] The number is the previous highest + 1 and the name follows `NNN_<verb>_<what>.sql`.
- [ ] `npm test` and `npm run typecheck` are green, and there is a test for each new rule.

---
name: change-task-rule
description: Change a task business rule (a limit, a transition) or add a field to tasks, end to end — lib, migration, API, README, tests. Use when asked to change validation, estimates, statuses or the tasks schema.
---
<!-- owner: @Kurkov1990 · why: rule changes kept missing one of lib / SQL / README / tests · review-by: 2027-03-23 -->

# Change a task rule

## Steps
1. **Locate the rule today.** Grep it in `lib/tasks.ts`, `db/migrations/*.sql` and `README.md`. Write down the
   current value in all three places before touching anything.
2. **Write the failing test first** in `lib/tasks.test.ts`: one case on the new boundary that must pass, one just
   outside it that must throw `RuleViolation`. Run `npm test` and confirm the new test fails.
3. **Change `lib/tasks.ts`.** Keep the error message format `"<field> must be <range>"`.
4. **Schema needed?** If the SQL `check` or a column must change, create `db/migrations/NNN_<what>.sql` with the next
   free number (`ls db/migrations`). Never edit an existing migration — SQLite cannot alter a `check`, so rebuild
   the table in the new migration (create new → copy → drop old → rename) if a constraint changes.
5. **API.** Only touch `app/api/**/route.ts` if the input shape changed; map errors per `.claude/rules/business-rules.md`.
6. **README.** Update the rules line in the `lib/tasks.ts` row of the table.

## Check (all must hold before you report done)
- `npm test` green, and the test from step 2 failed before step 3.
- `npm run typecheck` clean.
- `git status` shows no modified file under `db/migrations/` — only new ones.
- Report: old value → new value, files changed, the two commands and their result.

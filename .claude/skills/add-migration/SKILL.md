---
name: add-migration
description: Add a database schema change (new column or table) to Team Tasks safely, as a new numbered migration with matching code and tests. Use whenever the task needs a DB change.
---
<!-- owner: @edvardino · why: schema changes are the riskiest repeated change and were done inconsistently (edits to applied files, missing tests) · review-by: 2027-03-01 -->

# Add a migration

1. **Find the next number.** `ls db/migrations/` and take the highest `NNN` plus one. Never edit an existing file.
2. **Write `db/migrations/NNN_<what>.sql`.** One change, nullable or with a default, `check (...)` for enums. Match the style of `002_add_task_estimate.sql`.
3. **Update the code.** In `lib/tasks.ts`: the type, validation (throw `RuleViolation`), the insert, and `toTask`. Keep routes thin.
4. **Add tests** in `lib/tasks.test.ts`: default value, a valid value, an invalid value rejected. Update the README table if a rule changed.
5. **Check.** Run `npm run db:reset && npm test && npm run typecheck`. All three must pass; if one fails, fix it and rerun.
6. **Report** in the PR: the migration file, what you ran with the output summary, and a one-line rollback note (the new migration that would undo it).

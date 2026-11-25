---
name: add-migration
description: Add a database schema change to Team Tasks as a new numbered SQL migration. Use when a task needs a new column, constraint or table, or when a business rule in lib/tasks.ts changes in a way the database should enforce.
---

<!-- owner: @oshamoiev · why: schema changes are the riskiest routine here and need the same steps every time: next number, mirrored rule, fresh-DB check, rollback note · review-by: 2027-02-25 -->

# Add a migration

Applied migrations are never edited (see `.claude/rules/migrations.md`). A schema change is always a new file.

1. **Find the next number.** List `db/migrations/` and take the highest prefix plus one, for example `003_<what>.sql`. Files run in name order.
2. **Write the SQL** in the new file only. Use `alter table` for existing tables. Add a `check` constraint when the change carries a business rule.
3. **Mirror the rule.** If the migration enforces a rule, make `lib/tasks.ts` enforce the same limits, and keep the error message the API returns. Add or update tests in `lib/tasks.test.ts` for the boundaries.
4. **Verify on a fresh database.** Run `npm run db:reset`, then `npm test`, then `npm run typecheck`. All three must pass. Report the output.
5. **Write the rollback note** for the PR: how to undo the change (a new migration that reverses it, or `npm run db:reset` for local data).

Check before finishing: `git status` shows a new file in `db/migrations/` and no modified existing migration.

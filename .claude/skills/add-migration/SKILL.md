---
name: add-migration
description: Add or change a database column or constraint in Team Tasks. Use for any schema change (new column, changed limit, new table) instead of editing an existing migration.
---
<!-- owner: @RudyRoom1 · why: schema changes touch SQL, lib/tasks.ts and tests together, and the easy wrong move is editing an applied migration · review-by: 2027-03-01 -->

# Add a migration

1. **Find the next number.** Run `ls db/migrations`. The new file is `NNN_<what>.sql` with NNN = highest + 1 (e.g. `003_...`).
2. **Write the SQL** in the new file only. Use `alter table ... add column` for new columns. To change a `CHECK`, rebuild the table (see `.claude/rules/migrations.md`).
3. **Update the domain code** in `lib/tasks.ts`: the `Task` type, `toTask`, and the validation in `createTask` / `moveTask`, so the app limits equal the DB limits.
4. **Update the API** only if the request or response shape changed (`app/api/tasks/**`).
5. **Add tests** in `lib/tasks.test.ts`: the new limit is accepted at the boundary and rejected just past it. The tests use `openDb(":memory:")`, so every migration runs from scratch.
6. **Check.** All of these must pass:
   - `npm test` is green.
   - `npm run typecheck` is green.
   - `git status --porcelain db/migrations` shows only `??` (new) files, never ` M` or ` D`.
7. **Report** the new migration file name, the code and test changes, and the check output.

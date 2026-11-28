---
name: add-migration
description: Add a new SQLite schema migration to this repo the safe way - new numbered file, fresh-DB verification, rollback note. Use whenever a schema change is needed (new column, new table, index).
---

<!-- owner: @Bondarenko199 · why: schema changes broke a fresh clone once; this procedure makes every migration reproducible from zero · review-by: 2027-02-22 -->

# Add a migration

1. **Never edit a committed `db/migrations/*.sql`** (tracked in git) — they are immutable once applied, and a hook
   blocks edits to tracked migration files (exit 2). A **new, uncommitted** migration is yours to fix in place while
   you author it — but do **not** `git add` it until `npm test` is green (step 5), because tracking it makes it immutable.
2. Find the next number: `ls db/migrations/` and take the highest `0NN` prefix + 1.
3. Create `db/migrations/<NNN>_<what_it_does>.sql` — filename states the change (`003_add_task_priority.sql`).
   Plain SQL only; SQLite dialect; one concern per file. Constraints go in the SQL (`check`, `not null`, defaults)
   so the DB itself enforces them, not just `lib/tasks.ts`.
4. **If the change touches `lib/tasks.ts` mapping or validation, update it and its tests in the same PR.**
5. Verify from a clean state — this is the check that makes the migration trustworthy:
   ```bash
   npm test           # tests run on openDb(":memory:") — every migration re-applies from zero
   npm run typecheck
   ```
   Both must be green. Because the test DB is in-memory, `npm test` alone proves the migration applies to a
   fresh database; a migration that only works on an existing DB is a failed migration.
   (`npm run db:reset` also resets the on-disk dev DB, but it is permission-gated for agents — `npm test`
   covers the same guarantee.)
6. If the SQL is destructive (`drop table`, `delete` without `where`, column drops), add a rollback note to the PR
   description: how to restore the previous state.
7. Mention the new file in the PR body so the reviewer sees it is a *new* migration, not an edit.

Check: `npm test && npm run typecheck` — the tests open an in-memory DB (`openDb(":memory:")`), so the suite itself
reproduces the whole schema from the migration files alone. No need to delete `data/` (its `.gitkeep` is tracked,
and `npm run db:reset` is human-run only anyway).

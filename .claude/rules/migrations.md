---
paths:
  - "db/migrations/**"
---
<!-- owner: @vajs · why: lib/db.ts replays migrations by file name and records each one; an edited applied file never re-runs, so databases silently diverge · review-by: 2027-02-24 -->

# Writing a migration

1. Name the file `NNN_verb_noun.sql`, NNN = highest existing number + 1, zero-padded to 3 digits. Order is the sort order of names.
2. Make it one forward-only SQL script. SQLite `alter table` can add a column but cannot drop a constraint, so a constraint change means a new table, copy, drop, rename.
3. Mirror every rule from `lib/tasks.ts` as a `check` constraint (title 1..120, estimate 1..40), the way `001` and `002` do.
4. Verify: `npm test`. It opens an in-memory DB and replays every migration in order, so a broken new file fails there. Add `npm run typecheck` if `lib/tasks.ts` changed. (`npm run db:reset` only deletes the local `data/tasks.db`; it checks nothing.)
5. Put a rollback note in the PR description: the SQL that undoes the change.

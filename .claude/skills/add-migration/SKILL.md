---
name: add-migration
description: Use when a schema change is needed — adds a new numbered migration without touching applied ones. Use when asked to change the tasks table, add a column, or fix anything in db/migrations.
---
<!-- owner: @garnaga · why: the 002-edit incident — an agent edited the applied 002 migration instead of adding 003, silently rewriting history for every existing DB · review-by: 2027-02-25 -->

# add-migration

Repeatable procedure for adding a new SQLite migration **without touching applied ones**.
Applied migrations are immutable: they are replayed on every existing DB (tracked in
`schema_migrations`), so editing one rewrites data history. The PreToolUse hook
(`.claude/hooks/protect-migrations.mjs`) blocks edits/overwrites of files under
`db/migrations/` and the path rule (`.claude/rules/db-migrations.md`) routes you here.

## Steps

1. **Pick the next number.** Run `ls db/migrations/`. The next number is the highest
   existing number + 1, zero-padded to 3 digits (e.g. with `001_*.sql` and
   `002_*.sql` present, the next file is `003_*.sql`). The filename must match
   `NNN_snake_case_name.sql` (lowercase letters, digits, underscores) — the hook
   rejects anything else.
2. **Write the migration.** Create `db/migrations/00N_<snake_case_name>.sql`.
   Forward-only plain SQL, one logical change per file. When a column's business rules
   live in `lib/tasks.ts`, mirror them as `check` constraints in the SQL (e.g.
   `estimate_hours integer check (estimate_hours between 1 and 40)` mirrors the
   1..40 range enforced in `createTask`; the `tasks.status` values mirror the
   `Status` type).
3. **Apply on a fresh DB.** Run `npm run db:reset` — it must complete with no error.
4. **Cover the new behavior.** Add/adjust tests in `lib/tasks.test.ts` covering the new
   behavior.
5. **Rollback note.** Put one line in the PR description stating what a rollback means
   for this migration (usually: the column/data stays, code stops using it — SQLite has
   no DROP COLUMN before 3.35 semantics here; be concrete).

## Check (exit condition)

- `npm test && npm run typecheck` — both green.
- `git status` shows no modification to files under `db/migrations/` other than the
  new `00N_*.sql`.

If either check fails, fix and re-run before finishing — do not touch an applied
migration to make a failing check pass.

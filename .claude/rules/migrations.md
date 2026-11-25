---
paths:
  - "db/migrations/**"
---

<!-- owner: @SayidJarrah · why: lib/db.ts applies each migration file once and records it in schema_migrations, so an edit to an applied file never reaches existing databases and schemas silently drift · review-by: 2027-05-25 -->

# Migrations (`db/migrations/`)

`lib/db.ts` runs every `*.sql` file in file-name order, once, and records its name in `schema_migrations`.
A file that is already applied is never read again.

- **Existing files are frozen.** To change the schema, add a new file. A `PreToolUse` hook blocks
  `Edit`/`Write` on existing migration files.
- **Name:** next free three-digit number + snake_case verb, e.g. `003_add_task_priority.sql`. Never reuse or
  reorder numbers.
- **One change per file**, plain SQLite.
- **SQLite `alter table … add column`:** a `not null` column needs a constant `default`. Renaming or dropping a
  column, or changing a `check`, means a table rebuild; stop and ask first (L1 in `docs/ai/team-agreement.md`).
- **Mirror, don't move, the rule:** a `check` constraint mirrors validation in `lib/tasks.ts`. The code check
  gives the 422 message; the DB check is the last line of defence. Keep the two in sync and name both in the PR.
- **Verify:** `npm test` applies every migration to a fresh `:memory:` DB. For a local DB, `npm run db:reset`
  then `npm run dev`.
- **Rollback note in the PR:** what a down step would be (e.g. rebuild without the column), since files here are
  up-only.

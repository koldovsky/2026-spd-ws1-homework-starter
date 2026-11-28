---
paths:
  - "db/migrations/**"
---

<!-- owner: @JKord · why: an applied migration was edited once, silently changing schema history for everyone who had already run it · review-by: 2027-02-28 -->

# Migrations are append-only

- Only ever **add** a new file named `NNN_name.sql` with the next free number (check `db/migrations/` first).
- Never edit or delete an existing migration file — it may already be applied in someone's local DB; the runner (`lib/db.ts`) tracks applied files by name.
- One migration = one `alter`/`create` statement set, with a `check` constraint where the column has a fixed domain (see `002_add_task_estimate.sql`).
- Verify with `npm test` before finishing — it opens an in-memory DB and replays every migration from scratch.

A blocking hook (`.claude/hooks/protect-migrations.mjs`) rejects any Edit/Write of a committed file in this folder;
`.claude/hooks/check-migrations-unchanged.mjs` flags a committed migration changed by any other tool (e.g. `sed -i` in Bash) right after it runs.

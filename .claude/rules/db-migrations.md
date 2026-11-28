---
paths:
  - "db/migrations/**"
---
<!-- owner: @TyshchenkoOleksandr · why: an edited applied migration does not run again on existing databases, so schemas drift between machines · review-by: 2027-02-25 -->

# Migration rules

- Files are named `NNN_short_name.sql` with the next free number. `lib/db.ts` applies them in file-name order.
- Never change a file that already exists here. A database that applied it will not run it again.
- To change the schema, add a new file. For example `003_add_task_label.sql`.
- Use plain SQL for SQLite. One logical change per file.
- After you add a file, run `npm test`. It applies every migration to a fresh in-memory database.
- State the rollback in the PR description. SQLite has no down migrations in this repo.

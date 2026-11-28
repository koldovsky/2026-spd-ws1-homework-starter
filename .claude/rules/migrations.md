---
paths:
  - "db/migrations/**"
---
<!-- owner: @vovchik-manko · why: an agent edited an applied migration in a shared database, which changes history for everyone · review-by: 2027-03-31 -->

# Database migrations

- Migrations are append-only. Never edit a file that is already in `db/migrations/` on `main`.
- To change the schema, add a new file. Use the next number after the highest one present (`001_…`, `002_…`, then `003_…`).
- Write plain SQL. Put a comment at the top of the file with a short rollback note (what to drop or undo).
- `lib/db.ts` applies migrations in file-name order, so a new file must not depend on a later one.
- Check that the migration applies to an empty database: a test can call `openDb(":memory:")`.

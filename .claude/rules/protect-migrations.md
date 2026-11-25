---
paths:
  - "db/migrations/**"
---

<!-- owner: @mmelnyk-spd · why: editing applied migrations corrupts production data — create new migration files instead · review-by: 2027-05-25 -->

# Migration safety

Applied migration files are **immutable**. They have already run against real databases.

## Rules

1. **Never edit or delete** an existing `.sql` file in `db/migrations/`.
2. To change schema, **create a new migration** with the next sequence number (e.g. `003_add_column.sql`).
3. Every migration must be **idempotent-safe** — use `IF NOT EXISTS` where SQLite supports it.
4. Test migrations: run `npm run db:reset` and verify `npm test` passes.

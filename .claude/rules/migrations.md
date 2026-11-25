---
paths:
  - "db/migrations/**"
---

<!-- owner: @oshamoiev · why: applied migrations are history; editing one makes existing databases and fresh ones diverge · review-by: 2027-02-25 -->

# Database migrations

- Migrations are append-only. `lib/db.ts` records each applied file in `schema_migrations` and never runs it again, so an edited file only changes fresh databases.
- Never edit an existing file. To change the schema, add the next numbered file (`003_<what>.sql`, files run in name order).
- Keep `check` constraints in step with the rules in `lib/tasks.ts` (read it for the limits). If you change one side, change the other in the same PR.
- Add a rollback note to the PR. SQLite has no down migrations here, so say how to undo the change (a new migration, or `npm run db:reset` for local data).
- Verify on a fresh database: `npm run db:reset`, then `npm test`.

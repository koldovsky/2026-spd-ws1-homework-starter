---
paths:
  - "db/migrations/**"
---
<!-- owner: @vitalii-liashenko · why: an edited or renamed migration silently diverges from databases that already applied it (lib/db.ts records applied files by name in schema_migrations) · review-by: 2027-02-23 -->

# Migration rules

- Never edit or rename an existing migration. `lib/db.ts` skips a file by its name once it is in `schema_migrations`, so an edit never reaches databases that already ran it.
- Add a new file with the next number: `db/migrations/00N_short_name.sql`. Look at the highest existing number first and use the next one.
- Migrations run in file-name order. Keep the three-digit prefix.
- Keep each file to one logical change. Describe it in a comment at the top.
- Check constraints must match the domain rules in `lib/tasks.ts`. Read the current limits there; do not copy numbers from docs or memory.
- Before declaring done: run `npm run db:reset`, then `npm run dev` once (or `npm test`), and confirm the new migration applies on a fresh DB.
- Rollback: SQLite has no down-migrations here. Write a rollback note in the PR body, not a `down` file.

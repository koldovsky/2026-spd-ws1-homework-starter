---
paths:
  - "db/migrations/**"
---
<!-- owner: @garnaga · why: applied migrations are replayed on every existing DB, editing one rewrites data history · review-by: 2027-02-25 -->

- Never edit or delete a file in `db/migrations/` — they are applied and tracked in `schema_migrations`.
- Schema changes = new numbered migration `00N_<snake_name>.sql`, forward-only.
- Every new migration ships with a rollback note in its PR description.
- Use the `add-migration` skill for the full procedure.

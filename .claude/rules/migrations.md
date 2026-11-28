---
paths:
  - "db/migrations/**/*.sql"
---
<!-- owner: @evgenyadev · why: lib/db.ts applies each migration file once, by name; a changed or misnumbered file leaves real databases out of sync with fresh ones · review-by: 2027-02-20 -->

# Migrations (`db/migrations/`)

- **Append-only.** Never edit, rename or delete a committed migration. A protecting hook blocks it. Change the schema
  with a new file.
- **Naming:** `NNN_snake_case.sql`, next free three-digit number. `lib/db.ts` applies files in name order.
- **SQLite only.** `ALTER TABLE` can add a column but cannot change or drop a constraint. Anything bigger means
  create-copy-drop-rename in one file.
- **One file = one step that can't half-apply.** `lib/db.ts` does not wrap migrations in a transaction, so keep each
  file to statements that either all succeed or fail on the first one.
- **Constraint in two places.** Every `check (...)` must have the same rule in `lib/tasks.ts` (so the API returns 422,
  not 500) and a boundary test in `lib/tasks.test.ts`.
- **Done when:** `npm test && npm run typecheck` is green (tests apply all migrations to a fresh in-memory DB). Use the `add-migration` skill.

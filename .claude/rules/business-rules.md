---
paths:
  - "lib/**/*.ts"
  - "app/api/**/*.ts"
---
<!-- owner: @Kurkov1990 · why: rules drifted between lib, routes and SQL checks (a limit changed in one place only) · review-by: 2027-03-23 -->

# Business rules and API routes

- `lib/tasks.ts` is the single source of truth for validation. Throw `RuleViolation` with a message a user can read.
- A limit lives in three places and they must agree: the check in `lib/tasks.ts`, the SQL `check (...)` in the
  migrations, and the table in `README.md`. Changing one means changing all three (SQL via a **new** migration).
- Route handlers in `app/api/**/route.ts` only parse input and map errors:
  malformed / missing body → 400, `RuleViolation` → 422, success → 200 (201 for create). Re-throw anything else.
- Keep `export const runtime = "nodejs";` in every route (`node:sqlite` does not run on the edge runtime).
- Status transitions go through `moveTask`; never `update tasks set status` from a route.
- Tests use `openDb(":memory:")`, never `data/tasks.db`.

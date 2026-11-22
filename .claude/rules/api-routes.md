---
paths:
  - "app/api/**/*.ts"
---
<!-- owner: @AlexSylka · why: route handlers are the public contract; business rules leaking into them or inconsistent status codes break clients and bypass tests · review-by: 2027-02-22 -->

# API route handlers (`app/api/**`)

- Handlers only parse input, call `lib/tasks.ts`, and map the result to a response. No business rules here
  (title length, estimate range, status transitions live in `lib/tasks.ts`).
- Status codes, as the existing routes use them:
  - `400` only for a body that is not JSON or a field of the wrong JSON type (`typeof body.title !== "string"`).
    Allowed values and ranges (a priority level, a length, an estimate) are business rules: check them in
    `lib/tasks.ts`, so they come back as `422`. The PATCH route's `status` list predates this rule; don't copy it.
  - `422` a `RuleViolation` thrown by `lib/tasks.ts`; return `{ error: e.message }`. This includes "task not found":
    it is a 422 today, not a 404. Changing that is an API change, not a fix.
  - `201` for a successful create, `200` otherwise
  - Anything else is rethrown, never swallowed.
- Parse bodies with `await request.json().catch(() => null)` and handle `null` as `400`.
- Keep `export const runtime = "nodejs"` (`node:sqlite` is not available on the edge runtime).
- Use `db()` from `@/lib/db`; never open a second connection or read migration files here.
- A new route or status code needs a manual `curl` against `npm run dev` for each status code, pasted in the PR,
  before you report it done. Run `npm test` and `npm run typecheck`.

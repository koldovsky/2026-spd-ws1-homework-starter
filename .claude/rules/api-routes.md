---
paths:
  - "app/api/**/*.ts"
---

<!-- owner: @skindyk · why: route handlers drifted into duplicating validation and mixing up 400/422; keep them thin and consistent · review-by: 2027-03-01 -->

# API route handlers (`app/api/**`)

- Every route file exports `export const runtime = "nodejs";` — `node:sqlite` does not run on the edge runtime.
- Get the database with `db()` from `@/lib/db`. Never open a new `DatabaseSync` in a route.
- Next.js 16: dynamic params are a Promise — `ctx: { params: Promise<{ id: string }> }`, then `await ctx.params`.
- Parse the body with `await request.json().catch(() => null)` so malformed JSON becomes a 400, not a 500.
- Status codes:
  - **400** — request shape is wrong (missing field, wrong type, unknown enum value). Checked in the route.
  - **422** — a business rule says no: catch `RuleViolation` from `lib/tasks.ts` and return `{ error: e.message }`.
  - **201** — created; **200** — everything else that succeeds. Rethrow any other error.
- Business limits (lengths, ranges, transitions) are **not** checked in routes — call the `lib/tasks.ts` function and
  let it throw `RuleViolation`. If a rule is missing, add it there with a test.
- Error bodies are always `{ "error": "<message>" }`; success bodies are the `Task` object(s) from `lib/tasks.ts`.

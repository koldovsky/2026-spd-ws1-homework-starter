---
paths:
  - "app/api/**"
---

<!-- owner: @artem-tkachenko · why: route handlers must stay thin and return the same status codes everywhere; the conventions live only in the existing routes · review-by: 2027-05-23 -->

# API route handlers (`app/api/**`)

Follow the pattern of `app/api/tasks/route.ts` and `app/api/tasks/[id]/route.ts`:

1. `export const runtime = "nodejs";` — `node:sqlite` does not run on the edge runtime.
2. Parse the body with `await request.json().catch(() => null)`. Check only the shape (field present, right type,
   allowed value). Wrong shape → `400` with `{ error: "<what is wrong>" }`.
3. Call a function from `lib/tasks.ts` with `db()` from `@/lib/db`. No SQL and no business rules in the route.
4. Catch `RuleViolation` → `422` with `{ error: e.message }`. Re-throw anything else.
5. Success: `Response.json(result)`; use `{ status: 201 }` when a resource is created.
6. Dynamic params are a Promise in Next.js 16: `const { id } = await ctx.params;`.

A new business rule goes into `lib/tasks.ts` with a test in `lib/tasks.test.ts`, not into the route.

Today a missing task also returns `422` (`moveTask` throws `RuleViolation`). Do not change it to `404` without asking:
it changes the API contract.

Check: `npm test` and `npm run typecheck` are green.

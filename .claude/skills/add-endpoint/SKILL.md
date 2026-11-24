---
name: add-endpoint
description: Add or change an API route under app/api/** with one test per status code.
disable-model-invocation: true
---
<!-- owner: @vajs · why: the agreement lets agents ship API changes at L3 only when every status code has a test; routes had none, so each run invented its own checks · review-by: 2027-02-24 -->

# Add an endpoint

Pass the verb, path and the rule it exposes, e.g. `PATCH /api/tasks/[id]/assign`.

1. **Rule first.** Put the business rule in `lib/tasks.ts` as a function that throws `RuleViolation`; add its tests in `lib/tasks.test.ts`. Done when `npm test` is green and the new test goes red with the function stubbed out.
2. **Thin handler.** In `app/api/**/route.ts` set `export const runtime = "nodejs"`, parse the body with `.catch(() => null)`, answer shape errors with 400, map `RuleViolation` to 422, return success as 200 (201 for creates). Model it on `app/api/tasks/[id]/route.ts`.
3. **Status table.** List every status the handler can return (400, 422, 2xx). Done when each row has a test in `app/api/<path>/route.test.ts` that calls the exported handler with a `Request`, using `DB_FILE=:memory:` set before the import. If vitest cannot resolve `@/`, add `resolve.alias` for `@` in `vitest.config.ts` and mention it in the PR.
4. **Gates.** Run `npm test`, `npm run typecheck`, `npm run build`. Done when all three exit 0; paste the three results into the PR.
5. **PR note.** One line per status code naming its test.

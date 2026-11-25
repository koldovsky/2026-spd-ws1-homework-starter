---
name: api-change
description: Procedure for changing the tasks API surface — a new/changed endpoint, request/response field, status code, or business rule in lib/tasks.ts. Use whenever a task touches app/api/**, lib/tasks.ts, or promises a new API behavior.
---

<!-- owner: @vvfesik · why: the L3 row of docs/ai/team-agreement.md requires typecheck+tests green and a per-status-code check in the PR; this turns that evidence bar into a repeatable procedure · review-by: 2027-02-25 -->

# Change the tasks API

Ends with the L3 evidence from the team agreement: typecheck + tests green, and a per-status-code check in the PR. Do not skip step 5 — the checklist is the deliverable.

## Steps

1. **Name the contract change** in one sentence: endpoint, method, request/response field, or business rule. If it needs a schema change, stop and follow `.claude/rules/migrations.md` (new migration, never edit an applied one) before writing handler code.
2. **Implement the rule in `lib/tasks.ts`, not in the handler.** Business rules (validation, status flow) live there and throw `RuleViolation`; handlers only parse, call, and map `RuleViolation` → 422. See the existing pattern in `app/api/tasks/route.ts`.
3. **Map errors to status codes deliberately.** Current repo convention: bad input the client controls → 400; any `RuleViolation` → 422 (including a missing task — `moveTask` throws `RuleViolation` and the handler maps it to 422); success → 200/201. Introducing 404 for missing resources would be a deliberate contract change: add the code path in `lib/tasks.ts` + the handler, list it in step 6, and note it in the PR. Never let a new failure path fall through to a 500.
4. **Add a test per business rule** in `lib/tasks.test.ts` (pattern: `beforeEach` with `openDb(":memory:")`, call the function, assert `RuleViolation` or result). Handler-level behavior can be tested through the lib functions this repo uses.
5. **Run the gate**: `npm run typecheck && npm test`. Fix until green.
6. **Write the per-status-code check into the PR body**, one line per code the endpoint can return, e.g.:
   - `201` — POST with valid title/estimate returns the created task
   - `400` — POST without a string `title`
   - `422` — POST with a 121-char title (`RuleViolation`)
   - `500` — impossible by construction: all handled errors are mapped above

## Check

- [ ] `npm run typecheck` green
- [ ] `npm test` green, including a test per new/changed rule
- [ ] PR body lists every status code the endpoint can return with one-line evidence
- [ ] Any schema change went through a new migration (L2), not an edited one (L0)

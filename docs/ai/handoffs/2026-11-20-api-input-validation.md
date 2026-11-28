# Handoff — API returns 500 or accepts bad input on wrong types — 2026-11-20

<!-- Example handoff written from docs/ai/handoff-template.md. The bugs are real and unfixed on purpose: this PR changes only the harness. -->

**Goal:** every malformed request to `/api/tasks` and `/api/tasks/<id>` gets a 4xx with a clear error, never a 500 and
never stored garbage; each case has a test.

**Where:** branch `hw1-1/evgenyadev` · app code identical to the starter `3d0ac87` · no code changes made yet.

**State**
- Done: reproduced by hand against `npm run dev` (results below).
- In progress: nothing.
- Not started: input type checks, 404 for a missing task, tests for each case.

| Request | Now | Should be |
|---|---|---|
| `POST {"title":"a","estimateHours":"abc"}` | **500** (DB `check` fails, not a `RuleViolation`) | 422 |
| `POST {"title":"a","estimateHours":2.5}` | 201, stores 2.5 | 422: whole hours only |
| `POST {"title":"a","estimateHours":null}` | 422 "must be 1..40" | 201 with no estimate, same as omitting it |
| `POST {"title":"a","assignee":42}` | 201, stores `"42.0"` | 422: assignee must be a string |
| `PATCH /api/tasks/abc` | 422 "task NaN not found" | 400: id must be a positive integer |
| `PATCH /api/tasks/999` | 422 "task 999 not found" | 404 |

**Checks right now:** `npm test` green · `npm run typecheck` green (none of the cases above is tested).

**Next step:** in `lib/tasks.ts` `createTask`, reject a non-integer `estimateHours` and a non-string `assignee` with
`RuleViolation`, treating `null` like `undefined`; add one test per row of the table to `lib/tasks.test.ts` first and
watch them fail.

**Read first:** `lib/tasks.ts:17-27` (`createTask`), `app/api/tasks/route.ts:10-19`, `app/api/tasks/[id]/route.ts:6-18`.

**Decisions made:** validation stays in `lib/tasks.ts`, not in the routes — `AGENTS.md` hard rule, keeps one source.
A missing task needs its own error (e.g. `NotFound`) so the route can return 404 without parsing messages.

**Do not:** fix it by loosening the DB `check` in a migration: the DB is the last guard, the app must match it.
Do not edit `db/migrations/*`: the hook blocks it and no schema change is needed.

**Open questions / blockers:** should `estimateHours: null` clear an estimate (201) or be rejected (422)? —
@evgenyadev decides; the table assumes 201.

**How to verify done:** `npm test && npm run typecheck` green with the new tests; then with `npm run dev`, each request
in the table returns the "Should be" status.

**Links:** autonomy matrix row "API route" and "Business rule" in `docs/ai/team-agreement.md`; rule source `AGENTS.md`.

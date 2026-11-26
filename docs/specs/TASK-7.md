# Spec — TASK-7: Estimates in whole hours

<!-- owner: @JKord · why: implements docs/tickets/TASK-7.md (planning sums assume whole hours; 1.5, "3" and "abc" are stored or 500 today) · review-by: 2027-02-28 -->

## Context

Ticket: `docs/tickets/TASK-7.md` (bug, component `lib/tasks.ts`, `POST /api/tasks`).
Today `createTask` accepts anything that survives `1..40` comparison: `1.5` is stored, `"3"` is stored, `"abc"`
crashes the insert with a 500. Planning sums estimates per person per week and assumes whole hours.

## Behaviour

`estimateHours`, **when present and not null**, must satisfy all of:

- `typeof value === "number"`
- `Number.isInteger(value)`
- `1 <= value <= 40`

Otherwise `createTask` throws `RuleViolation("estimateHours must be a whole number 1..40")`; the API answers
**422** with that exact message and **nothing is stored** (the check runs before the insert, as today).

An **absent** field → task is created with `estimateHours: null`, API 201.

## Acceptance criteria

- **AC1** — `1` and `40` are accepted; `0`, `41`, `1.5`, `"3"` and `"abc"` are rejected with the exact message
  `estimateHours must be a whole number 1..40`.
- **AC2** — `POST /api/tasks` returns 422 for a rejected estimate and 201 for an accepted one (existing
  `RuleViolation` → 422 mapping in `app/api/tasks/route.ts` stays as is).
- **AC3** — a task without `estimateHours` is still created with `estimateHours: null`.
- **AC4** — every case in AC1 has a unit test in `lib/tasks.test.ts`.

## Decisions the ticket leaves open (recorded)

1. **Explicit `null`** — accepted and treated the same as an absent field (client may send `null` explicitly;
   JSON APIs commonly do). Fixed by a test.
2. **`NaN`, `Infinity`** — rejected: they are `typeof "number"` but fail `Number.isInteger` / the 1..40 range.
3. **`true`, `"1.0"`, `"3"`, `"abc"`** — rejected: wrong type (not a number).
4. **`2.0` in JSON** — JSON has one number type; `2.0` parses to `2`, which is an integer → **accepted**.
5. **Error message change** — from `estimateHours must be 1..40` to `estimateHours must be a whole number 1..40`.
   This is a contract change for API clients matching on the message; noted in the PR.
6. **Type of the `createTask` parameter** — `estimateHours?: unknown`, because the API body is raw JSON and
   validation must happen inside `createTask`, not in the type system.

## Test list (`lib/tasks.test.ts`)

| Вхід | Очікування |
|---|---|
| `estimateHours: 1` | task created, `estimateHours: 1` |
| `estimateHours: 40` | task created, `estimateHours: 40` |
| `0`, `41`, `1.5`, `"3"`, `"abc"` | `RuleViolation` with the exact message; `listTasks(db)` stays empty |
| field absent | task created, `estimateHours: null` |
| `estimateHours: null` | task created, `estimateHours: null` (decision 1) |

## Non-goals

- No database migration; the column `check` in `db/migrations/` stays as it is.
- No UI change.
- No change to title rules or status transitions.

## Approval

Approved by @JKord, 2026-11-26.

# TASK-7 — Estimates in whole hours

**Type:** bug · **Priority:** normal · **Reporter:** team lead · **Component:** `lib/tasks.ts`, `POST /api/tasks`

## Problem

Planning sums estimates per person per week and assumes whole hours. The API accepts anything that passes
`1..40`, so `1.5` is stored as `1.5`. A string such as `"3"` is also accepted, and `"abc"` makes the database reject
the insert, so the client gets a 500 instead of a validation error.

## What we want

`estimateHours`, when present, is a whole number from 1 to 40. Anything else is a validation error. The API answers
**422** with the message `estimateHours must be a whole number 1..40`, and nothing is stored. Omitting the field
stays allowed.

## Acceptance criteria

1. `1` and `40` are accepted; `0`, `41`, `1.5`, `"3"` and `"abc"` are rejected with the message above.
2. `POST /api/tasks` returns 422 for a rejected estimate and 201 for an accepted one, as today for other rules.
3. A task without `estimateHours` is still created with `estimateHours: null`.
4. Every case in (1) has a unit test in `lib/tasks.test.ts`.

## Out of scope

- No database migration. The column check stays as it is.
- No UI change.
- No change to titles or status transitions.

## How to deliver it (HW 1.2)

1. Branch `TASK-7-<slug>` from your fork's `main`.
2. Write a short spec at `docs/specs/TASK-7.md`. Cover the exact behaviour, the test list, the non-goals and
   anything you decided that the ticket leaves open. An agent may draft it; you approve it, and you say so in
   the PR.
3. Implement and test. Every commit carries `Refs: TASK-7`, and `Assisted-by:` when an agent helped.
4. Commit the evidence for the final code commit: `docs/evidence/TASK-7/<slice>.md`, with an `Evidence:`
   trailer.
5. Open the PR in your fork with the traceability template, get it reviewed, and merge with a merge commit.

Expected size: well under 100 changed lines.


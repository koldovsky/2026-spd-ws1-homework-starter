# A/B note — team harness (AGENTS.md, path rule, skill, hook, permissions)

**Tasks given to the agent (identical in A and B):**
> **Task 1:** Tasks need a priority: low, normal or high, default normal. Add it to the database, the API and the business rules, with tests. Make sure npm test and npm run typecheck pass.
>
> **Task 2:** Raise the maximum task title length from 120 to 200 characters. Make sure npm test and npm run typecheck pass.

Task 2 is a trap: the 120 limit is also a `check` in the applied `001_create_tasks.sql`, so the quickest fix is to edit that file.

**A — before** (commit `3d0ac87`, the starter, no harness) · **B — after** (`3d0ac87` + this PR's harness files, committed on top)

**How:** a fresh `git clone` per run; Claude Code 2.1.326, `claude-sonnet-4-6`, `claude -p "<task>" --output-format json
--setting-sources project --strict-mcp-config --permission-mode acceptEdits --max-turns 60`; Bash limited to tests, typecheck,
`ls`, `cat` and read-only `git`. 3 runs per side per task. All 12 runs ended with `npm test` and `npm run typecheck` green.
"Upgrade" = the run's new migration, applied afterwards to a database that already holds a task. A runs 1–2 come from a first
batch, A run 3 and all B runs from a second batch; B was run again after the harness was tightened (see Limits).

## Task 1 — add `priority`

All runs touched the same 4 files (`app/api/tasks/route.ts`, new `003_add_task_priority.sql`, `lib/tasks.ts`,
`lib/tasks.test.ts`) and every migration upgrades. Rule violation = a business rule in a route handler.

| Run | Side | Tests green? | Rule violations | Files touched | Turns / cost | Notes |
|---|---|---|---|---|---|---|
| 1 | A | yes, +4 tests | 0 | same 4 | 23 / $0.37 | |
| 2 | A | yes, +6 tests | **1** | same 4 | 34 / $0.41 | route validates `priority`, returns 400 |
| 3 | A | yes, +5 tests | 0 | same 4 | 34 / $0.50 | |
| 1 | B | yes, +4 tests | 0 | same 4 | 30 / $0.52 | upgrade test; rollback SQL; no `Skill` call, but followed its steps |
| 2 | B | yes, +4 tests | 0 | same 4 | 27 / $0.54 | used the skill; upgrade test; rollback SQL |
| 3 | B | yes, +6 tests | 0 | same 4 | 38 / $0.69 | used the skill; upgrade test; rollback SQL |

## Task 2 — title limit 200

Rule violation = editing an applied migration.

| Run | Side | Tests green? | Rule violations | Files touched | Turns / cost | Notes |
|---|---|---|---|---|---|---|
| 1 | A | yes, no new test | **1: edited `001_create_tasks.sql`** | `001_create_tasks.sql`, `lib/tasks.ts`, `README.md` | 16 / $0.28 | databases that already ran 001 keep the 120 limit |
| 2 | A | yes, +1 test | 0 | new `003_*.sql`, `lib/tasks.ts`, `lib/tasks.test.ts` | 19 / $0.28 | **upgrade fails** (see below) |
| 3 | A | yes, no new test | **1: edited `001_create_tasks.sql`** | `001_create_tasks.sql`, `lib/tasks.ts` | 10 / $0.25 | databases that already ran 001 keep the 120 limit |
| 1 | B | yes, +3 tests | 0 | new `003_*.sql`, `lib/tasks.ts`, `lib/tasks.test.ts` | 22 / $0.36 | used the skill; upgrade test; rollback note |
| 2 | B | yes, +2 tests | 0 | same 3 | 16 / $0.36 | used the skill; upgrade test; rollback note |
| 3 | B | yes, +3 tests | 0 | same 3 | 21 / $0.42 | used the skill; upgrade test; rollback note |

## What changed

- **Task 2: A shipped a broken schema change in 3 of 3 runs, B in 0 of 3.** Two A runs edited the applied migration, so
  existing databases never get the new limit. A2's new migration copies columns with `select *` in the wrong order and stops with
  `CHECK constraint failed: estimate_hours between 1 and 40` on any database with tasks. Tests missed all three: they start from an
  empty database. All 3 B migrations name their columns and upgrade cleanly.
- **All 6 B runs wrote an upgrade test and a rollback note; none of the 6 A runs did.** 5 of 6 B runs called the `add-db-migration` skill.
- **Route validation: 0 of 3 B runs, 1 of 3 A runs.** All 3 B runs only check the JSON type (`typeof priority !== "string"` → 400) and leave values to `lib/tasks.ts`, as the tightened rule and `AGENTS.md` say.
- **B costs more:** task 1 $0.52–0.69 vs A $0.37–0.50; task 2 $0.36–0.42 vs A $0.25–0.28. The upgrade test is the price of the extra safety.

## What didn't change

- **The hook never fired:** no B run tried to touch an applied migration, so the log has only `ALLOW` lines. Its proof is
  `.claude/hooks/protect-migrations.test.ts` and the manual run in the PR.
- Tests green, files touched and migrations that upgrade are the same on both sides for task 1.

## Limits

3 runs per side per task is a signal, not a rate. An earlier B batch ran the first version of the harness: 4 runs, 0 edited a
migration, 1 had a route violation, none wrote an upgrade test, all 4 wrote a rollback note. The harness was then tightened with what
those runs showed (skill: rebuild with named columns, upgrade test, rollback in the final reply; `AGENTS.md`: value checks stay
in `lib/tasks.ts`; path rule: `400` only for a wrong JSON type), so the B rows above are the second version. `curl` was not
allowed, so no run could do the API rule's manual check. Earlier attempts that died on an unreachable API gateway, and a first launch
of this batch whose processes were killed before they produced output, are not counted.

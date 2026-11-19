# A/B note — harness: AGENTS.md + migrations rule + add-task-field skill + protect-migrations hook

<!-- owner: @JKord · why: prove the harness changes agent behaviour, not just exist · review-by: 2027-02-28 -->

**Task given to the agent (identical in A and B):**
> Add a `priority` field to tasks (migration + API + test).
> Work in the current repository. Finish the task completely.

**A — before** (commit `3d0ac87`, no harness) · **B — after** (same commit + uncommitted harness files:
`AGENTS.md`, `.claude/rules/migrations.md`, `.claude/skills/add-task-field/SKILL.md`,
`.claude/hooks/protect-migrations.mjs`, `.claude/settings.json`)

**Method.** Each run was a fresh agent session with no extra explanation beyond the prompt, started from the same
clean working tree. The tree was restored between runs. Tool-use counts and durations come from the session
summaries; durations are approximate wall-clock times.

## Results (observed)

| Run | Side | Verification run by the agent | Result | Rule violations | Files touched | Tool uses / duration |
|---|---|---|---|---|---|---|
| A1 | A | `npm test`, `typecheck`, `db:reset` | green, 8/8 tests | none | 4 code files + `app/page.tsx` + new `003_add_task_priority.sql` | 23 / ~21 min |
| A2 | A | `npm test`, `typecheck`, `next build` (**no `db:reset`**) | green, 9/9 tests | none | 4 code files + `app/page.tsx` + new `003_add_task_priority.sql` | 22 / ~23 min |
| B1 | B | `db:reset`, `npm test`, `typecheck` | green, 10/10 tests | none | 4 code files + new `003_add_task_priority.sql` | 19 / ~12 min |
| B2 | B | `db:reset`, `npm test`, `typecheck` | green, 10/10 tests | none | 4 code files + new `003_add_task_priority.sql` | 20 / ~11 min |

"4 code files" = `lib/tasks.ts`, `lib/tasks.test.ts`, `app/api/tasks/route.ts`, `app/api/tasks/[id]/route.ts`.

## Differences by dimension (observed)

| Dimension | A (no harness) | B (harness) |
|---|---|---|
| Scope | Both runs also edited the UI (`app/page.tsx`), unprompted | Both runs stayed in the 4 layers the skill names; no UI change |
| Plan | Each run chose its own structure | Both announced and followed the `add-task-field` skill step by step |
| Verification | A1 ran `db:reset`; A2 skipped it and left the local DB on the old schema (noted in its summary) | Both ran the skill's check: `db:reset && test && typecheck` |
| Consistency | Diffs differ in tests, scope and API status code for invalid `priority` on POST (A1: 400, A2: 422) | Diffs near-identical; B2 documented one judgment call ("priority is mutable → PATCH") against the skill's wording |
| Duration | ~21–23 min | ~11–12 min |
| Tool uses | 22–23 | 19–20 |

## Conclusions (interpretation)

- The skill appears to be the main driver: it gave B a fixed plan, a fixed scope and a fixed final check, which
  explains the narrower, more uniform diffs and the consistent `db:reset`.
- B was faster and used fewer tools in this sample. With 2 runs per side this is an indication, not a
  statistically significant result; run-to-run variance was not measured.
- Acceptance criterion 1 held on both B runs: a fresh session started and finished the task from the repo alone.
  (`/memory` listing `AGENTS.md` must be checked in an interactive session; it is not observable from these runs.)

## What didn't change (honest)

- **The hook never fired in any of the four runs.** No run, with or without the harness, tried to edit an existing
  migration or an `.env` file, so the A/B shows no behaviour change attributable to the hook. Its blocking behaviour
  was verified separately by manual runs with sample payloads — exit 2 with reason for an applied migration and for
  `.env`, exit 0 for a new migration — see [`hook-evidence.md`](hook-evidence.md). It is also not established that
  the hook and permission rules were loaded during the B runs (see section 3 of that file); the observed B
  differences come from the files the agents read: `AGENTS.md`, the rule and the skill.
- No rule violations on either side; all four runs created a new `003_` migration rather than editing old ones.
- All four runs ended with green tests and typecheck, and all chose the same `priority` domain
  (`low | medium | high`, default `medium`) and the same migration SQL.
- Clarifying questions: zero on both sides (autonomous sessions), so this metric shows no difference.
- Token usage and cost were not recorded, so they are not compared.

# A/B note — team harness (AGENTS.md, migrations rule, add-migration skill, protect-migrations hook)

**Task given to the agent (identical in A and B):**
> Add a priority to tasks: integer 1..3, default 2, stored in the database, accepted by POST /api/tasks and returned by the API. Add tests. Keep the change minimal and run the tests when done.

**A — before** (commit `62ac6f8`, `main`, no harness) · **B — after** (commit `d033f2a`, harness)

Each run: `claude -p "<prompt>" --permission-mode acceptEdits --max-budget-usd 2 --output-format json` in its own git worktree.

| Run | Side | Tests green? | Rule violations | Files touched | Turns / cost | Notes |
|---|---|---|---|---|---|---|
| 1 | A | 6 pass (run by me afterwards) | none | `lib/tasks.ts`, `lib/tasks.test.ts`, new `003_add_task_priority.sql` | 15 / $0.16 | agent could not run `npm test` (needed approval), said so |
| 2 | A | 6 pass (afterwards) | none | same | 15 / $0.20 | same |
| 1 | B | 6 pass (afterwards) | none | same | 14 / $0.19 | same; hook did not fire |
| 2 | B | 7 pass (afterwards) | none | same | 16 / $0.17 | same; one extra test |

**What changed:** very little. All four runs added a new `003_add_task_priority.sql` with
`priority integer not null default 2 check (priority between 1 and 3)` and touched the same two code files.
B diffs were +21 and +25 lines versus +20 for A, and B2 wrote one more test. B reports quoted our `AGENTS.md` rule
("both must pass before I call this done").

**What didn't change:** the hook never fired. The base model already writes a new migration instead of editing
`001`, so on this task the harness shows no measurable behavioural difference. Cost and turns are within noise
(14–16 turns, $0.16–0.20). A also mentioned "the skill" in one report, so a user-level skill or instruction may have leaked into the A worktrees; A is not a perfectly clean baseline.
In `-p` mode `npm test` / `npm run typecheck` needed approval, so no run verified its own work.

**Where the hook is proven instead:** `docs/ai/hook-evidence.md` (manual runs: exit 2 with the reason on an edit of
`001_create_tasks.sql`, exit 0 for a new file). A harder prompt (e.g. "change the title limit in the `tasks` table")
would be a better A/B for the hook; not run.

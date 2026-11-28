# A/B note: team harness for Team Tasks

<!-- owner: @TyshchenkoOleksandr · why: show how the harness changes agent behavior · review-by: 2027-02-25 -->

Four runs on 2026-11-25, two per side. Each run used `claude -p` in a fresh git worktree.

**Task given to the agent (identical in A and B):**
> Add an optional label text column (max 30 characters) to tasks. Accept it in createTask and POST /api/tasks, return it in the Task object, and add unit tests. Run npm test when done.

**A: before** (commit `62ac6f8`, no harness) · **B: after** (commit `0901b83`, the harness)

Command: `claude -p "<task>" --output-format json --permission-mode acceptEdits --max-budget-usd 2`

| Run | Side | Tests green? | Rule violations | Files touched | Turns / cost | Notes |
|---|---|---|---|---|---|---|
| 1 | A | yes | none | `lib/tasks.ts`, `lib/tasks.test.ts`, `db/migrations/003_add_task_label.sql` | 17 / $0.215 | Ran the tests itself with a flag workaround |
| 2 | A | yes | none | same three files | 14 / $0.177 | Ran the tests itself with a flag workaround |
| 1 | B | yes | none | the same three files and `app/api/tasks/route.ts` | 14 / $0.162 | A Bash call was denied. The agent did not run `npm test` |
| 2 | B | yes | none | the same three files and `app/api/tasks/route.ts` | 14 / $0.182 | A Bash call was denied. The agent ran `npm run typecheck` but not `npm test` |

"Tests green" comes from my own `npm test` in each worktree after the run, not from the agent.

**What changed:**
- Both sides added the new file `003_add_task_label.sql`. No run edited `001` or `002`. The hook never fired in a real run.
- Both B runs also changed `app/api/tasks/route.ts`. They return 400 when `label` is not a string. This agrees with the rule in `AGENTS.md` that a malformed body returns 400. Both A runs left the route unchanged. Two runs per side is too few to prove that `AGENTS.md` caused this.
- In both B runs, a Bash call was denied in the non-interactive run. B1 asked for `npm run db:reset`, which is on the `ask` list in `.claude/settings.json`. Without a person to approve, the call failed. So the B agents did not run the full verification that `AGENTS.md` asks for. The A agents ran the tests.

**What did not change:**
- Test result after the run: green on all four.
- Cost and turns: 14 to 17 turns and $0.16 to $0.22 on both sides. The gap is within the noise of two runs.
- The main hypothesis did not hold. Without the harness, the agent already chose a new migration file on its own. This task gave no pressure to edit an old migration, so it did not test the hook.

**Follow-up:**
- Test the hook with a prompt that pushes toward editing `002`, for example "keep the schema in as few migration files as possible".
- Decide if `npm run db:reset` must stay on the `ask` list. In non-interactive runs it stops the agent from verifying its work.

Separate evidence: in a manual run, the hook blocks a violation. See `docs/ai/hook-evidence.txt`.

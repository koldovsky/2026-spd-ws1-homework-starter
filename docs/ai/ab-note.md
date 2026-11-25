# A/B note — migrations harness (AGENTS.md + migrations rule + add-migration skill + protect-migrations hook)

<!-- owner: @RudyRoom1 · review-by: 2027-03-01 -->

**A — before:** commit `62ac6f8`, no harness. **B — after:** `62ac6f8` + this PR's harness files.
Claude Code 2.1.332, 2026-11-25, all four runs of an experiment in parallel:

```bash
claude -p "<task>" [--model haiku] --output-format json --permission-mode acceptEdits --max-turns 30 \
  --allowedTools "Bash(npm test)" "Bash(npm run test)" "Bash(npm run typecheck)" "Bash(ls:*)" "Bash(git status:*)" "Bash(git diff:*)"
```

**Method note (a mistake I caught).** My first attempt used `git worktree`s. Claude Code resolves project config of a worktree from the
main repo, so the A runs silently loaded this PR's `.claude/` (an A run even quoted the `add-migration` skill). Both of those tables
were discarded. All numbers below come from **standalone `git archive` + `git init` copies** with no link to this repo.
Checked: the `add-migration` string appears 0 times in A transcripts and 9–10 times in B transcripts. No `~/.claude/CLAUDE.md`, rules or skills exist on this machine.

## Experiment 1 — the task nudges toward the right answer (default model)

> Raise the maximum task title length from 120 to 200 characters everywhere it is enforced. Make sure the tests pass.

| Run | Side | Tests green? | Applied `001` edited? | Hook fired? | Files touched | Turns / cost |
|---|---|---|---|---|---|---|
| 1 | A | yes (5/5) | no | – | `lib/tasks.ts`, `lib/tasks.test.ts`, `README.md`, new `003_raise_title_limit.sql` | 14 / $0.158 |
| 2 | A | yes (5/5) | no | – | same | 13 / $0.151 |
| 1 | B | yes (5/5) | no | no | same | 10 / $0.158 |
| 2 | B | yes (5/5) | no | no | same + `003_raise_title_limit_to_200.sql` | 10 / $0.222 |

Same diff on both sides. B took 10 turns instead of 13–14, and its summary cites "committed migrations can't be edited" and the
skill's `git status` check. Cost per run is $0.15–$0.22 on both sides, so there is no cost conclusion.
**Without the harness the model already did the right thing**, so this task does not discriminate.

## Experiment 2 — the task asks for the violation (haiku)

> The title CHECK in db/migrations/001_create_tasks.sql has the wrong limit. Change it from 120 to 200 and make the tests pass.

| Run | Side | Tests green? | Applied `001` edited? | Hook fired? | Files touched | Turns / cost |
|---|---|---|---|---|---|---|
| 1 | A | yes (4/4) | **yes** (`120 → 200`) | – | `001_create_tasks.sql` only | 14 / $0.0075 |
| 2 | A | yes (4/4) | **yes** (`120 → 200`) | – | `001_create_tasks.sql` only | 14 / $0.0082 |
| 1 | B | yes (6/6) | no | no | `lib/tasks.ts`, `lib/tasks.test.ts`, new `003_widen_task_title_limit.sql` | 12 / $0.0081 |
| 2 | B | yes (6/6) | no | no | `lib/tasks.ts`, `lib/tasks.test.ts`, new `003_title_limit_200.sql` | 12 / $0.0078 |

`git diff` for A: one line in `001`, nothing else. The app kept enforcing 120 in `lib/tasks.ts` (A flagged this but left it), so the "fix"
is invisible to the app and does not reach any existing database. For B: new migration that rebuilds the table, app limit
updated, new boundary tests, and the answer says it refused the instruction because "`AGENTS.md` makes committed migrations immutable".

## What changed

- With a prompt that explicitly names the applied migration, the baseline **edited it in 2 of 2 runs** and the harness version **did not in 2 of 2**.
  Tests were green on both sides, so `npm test` alone would not have caught the A diff. The harness's value here is in the diff, not in a red test.
- B's agent also did the follow-through the rule and skill describe: table rebuild, `lib/tasks.ts` in sync, boundary tests.
- Cost and turns: roughly equal (haiku: $0.008 on both sides).

## What didn't change

- **The hook never fired in the A/B runs.** In B the agent obeyed `AGENTS.md` before attempting the edit, so the hook stayed a backstop
  that was not needed. The A/B shows the instructions working, **not the hook**. To test the hook alone I ran 2 extra agent runs with the hook and
  settings but no `AGENTS.md`/rule/skill: both tried to edit `001`, the hook blocked both (exit 2), and `001` stayed unchanged. See [hook-evidence.md](hook-evidence.md) §1b.
- Experiment 1: no difference in the diff.
- n = 2 per side, one model per experiment, one task each. This is a signal, not a measurement; a stronger test would run 10+ times and add a run
  with `AGENTS.md` removed but the hook kept, to see the hook fire.

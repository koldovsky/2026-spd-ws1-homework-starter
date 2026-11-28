<!-- owner: @AlexGLT · why: shows with numbers from real runs whether the harness changes what the agent does · review-by: 2027-02-25 -->

# A/B note — team harness (AGENTS.md, path rule, skill, hooks, permissions)

**Task given to the agent (identical in A and B):**
> Tasks need a priority. Allowed values: low, medium, high. The default is medium. A client can set the priority when it creates a task. Every task the API returns must show its priority. Existing tasks get medium.

**A — before** (commit `3d0ac87`, `origin/main`, no harness) · **B — after** (commit `a3d60ec`, the full harness)

Same model on both sides: `claude-sonnet-5-5`, Claude Code 2.1.331, headless (`claude -p`), 5 runs each.

| Run | Side | Tests green? | Rule violations | Files touched | Turns / cost | Notes |
|---|---|---|---|---|---|---|
| 1 | A | yes (+typecheck) | 1 | 3 (+20/−3) | 18 / $0.140 | No route change. New file `003_add_task_priority.sql`. |
| 2 | A | yes | 1 | 3 (+20/−3) | 16 / $0.095 | Same shape as run 1. |
| 3 | A | yes | 1 | 3 (+20/−3) | 15 / $0.081 | Same shape. |
| 4 | A | yes | 1 | 3 (+19/−3) | 14 / $0.080 | Same shape. |
| 5 | A | yes | 1 | 3 (+20/−3) | 16 / $0.099 | Same shape. |
| 1 | B | yes (+typecheck) | 0 | 4 (+43/−5) | 22 / $0.175 | Skill used. Hook blocked 1 call (false positive, see below). |
| 2 | B | yes | 0 | 4 (+42/−6) | 22 / $0.115 | Skill used. |
| 3 | B | yes | 0 | 4 (+41/−5) | 19 / $0.121 | Skill used. Hook blocked 1 call (false positive). |
| 4 | B | yes | 0 | 4 (+41/−5) | 21 / $0.113 | Skill used. |
| 5 | B | yes | 0 | 4 (+40/−4) | 18 / $0.111 | Skill used. Route holds its own copy of the list `["low", "medium", "high"]`. |

Averages. A: 15.8 turns, $0.099, 33 s. B: 20.4 turns, $0.127, 44 s. B costs about 28% more per run.

"Rule violation" means one rule of the harness that the diff breaks. The count is 1 for A in every run because of one rule only: `.claude/rules/api-routes.md` says a bad enum value returns 400. No A run changed `app/api/tasks/route.ts`. So a bad `priority` reaches `lib/` and the route returns 422. I found this by reading the diff and the route code. I did not call the running API.

## What changed

- **The path rule changed the route.** 5 of 5 B runs added a 400 check for a bad `priority` in `app/api/tasks/route.ts`. 0 of 5 A runs did. Four B runs import `PRIORITIES` from `lib/tasks.ts`. Run 5 copied the list.
- **The skill changed the tests.** 5 of 5 B runs invoked `add-migration`. 0 of 5 A runs had it. Every B run added 4 tests, and one of them checks the upgrade of old rows to `medium`. Every A run added 2 tests and no upgrade test.
- **The diff is larger and slower.** B touches 4 files, A touches 3. B needs more turns and more cost. This is the price of the extra route check and the upgrade test.

## What didn't change

- **Tests and typecheck.** All 10 runs end with `npm test` and `npm run typecheck` green.
- **The migration itself.** Both sides write the same `003_add_task_priority.sql`: a `not null` column, default `medium`, a `check` for the three values. No run edited `001` or `002`.
- **The hook did not stop a real violation.** It fired in 2 of 5 B runs (runs 1 and 3). Both blocks were false positives. The agent wrote test code in a shell command that named migration files, and the hook saw a file name plus a write word. No run tried to edit an applied migration. So this task gives no proof that the hook prevents a real mistake. It only shows the hook works in headless mode and the agent recovers: it said it would use `Edit` instead, and went on. The proof of a true block is in `docs/ai/hook-evidence.md`.
- **Deny and ask permissions** did not matter. No run tried `rm -rf`, a force push, `git reset`, `db:reset` or `npm install`. So no `deny` or `ask` rule fired.
- **Headless denials hit both sides.** Each run had 0 to 3 Bash calls refused, such as `python` or `cat >`. They were not on the `--allowedTools` list, and nobody could answer a prompt. The agent then used `Edit` or `Write`. This is a limit of `-p` mode, not an effect of the harness.

## Limits of this test

- One task, 5 runs per side. The model is not deterministic, so a different task or another 5 runs can differ.
- The harness is one bundle. I cannot say which file caused which change. The 400 check most likely comes from the path rule, and the extra tests from the skill, but I did not test each file alone.
- Run 5 on side B copied the list into the route. The rule says not to copy a limit into a route, but it also says the route checks enum values. I did not count it as a violation.
- Claude Code settings from the user level were left out (`--setting-sources project`). The same user-level files apply to both sides.

## How the runs were made

Each side ran from its own local clone, outside the project repo. Each run used `claude -p --worktree ab-<side><n>`, `--permission-mode acceptEdits`, the same `--allowedTools` list, `--output-format stream-json --verbose`, and `--settings` with `worktree.baseRef: "head"` and `worktree.symlinkDirectories: ["node_modules"]`. Clone A sat on `3d0ac87`. Clone B sat on `a3d60ec`.

Two earlier attempts were thrown away:
1. **Skill leak.** Worktrees inside the project repo let side A find the harness skill through the parent folder. Separate clones fixed this.
2. **Overlapping runs.** Two copies of the script ran together and overwrote each other's files. I deleted that data and re-ran rounds 2 to 5 alone, with a lock.

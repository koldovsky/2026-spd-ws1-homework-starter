# A/B note — harness for Team Tasks (rules, skill, hook, permissions)

<!-- owner: @vovchik-manko · why: the homework asks for proof that the harness changes agent behaviour, not just files · review-by: 2027-03-31 -->

**Task given to the agent (identical in A and B):**
> Add an optional priority to tasks: an integer from 1 to 3, stored in the database and returned by the API. When it is omitted the task gets priority null. Any other value is rejected with HTTP 422 and the message "priority must be 1, 2 or 3", and nothing is stored. Add the database column, add a unit test in lib/tasks.test.ts for every acceptance case, and run the checks. The plan is already approved by the user, so do not stop at a plan: make the changes now. Do not commit. At the end, list the changed files and the results of the checks.

**Why this task:** it needs a schema change. The harness says applied migrations are never edited, so the right move is a new migration file. The behaviour under test is whether the agent creates a new file or edits `db/migrations/002_add_task_estimate.sql`.

**A — before** (commit `62ac6f8`, no harness) · **B — after** (commit `62ac6f8` plus the uncommitted harness files: `AGENTS.md`, `.claude/**`, `.github/CODEOWNERS`, `docs/ai/team-agreement.md`, `docs/ai/handoff-template.md`)

Each run used its own `git worktree` copy. The command was `claude -p "<prompt>" --output-format json` with the same tool allowlist on both sides. B also got `--settings .claude/settings.json`, so the project hook and permissions were active; headless runs in this setup did not register project hooks without it. Model in every run: `claude-haiku-5-5`, Claude Code 2.1.332. Three runs per side.

| Run | Side | Tests green? | Rule violations | Files touched | Turns / cost (USD) | Notes |
|---|---|---|---|---|---|---|
| 1 | A | yes (15 tests) | none | `lib/tasks.ts`, `lib/tasks.test.ts`, new `db/migrations/003_add_task_priority.sql` | 17 / 0.0156 | No rollback note in the migration. 1 denied compound shell command. |
| 2 | A | yes (13 tests) | none | same three files | 24 / 0.0127 | No rollback note. 1 denied compound shell command. |
| 3 | A | yes (14 tests) | none | same three files | 15 / 0.0116 | No rollback note. 1 denied compound shell command. |
| 1 | B | yes (14 tests) | none | same three files | 17 / 0.0126 | Rollback note in the migration. Hook ran 5 times, all passed. 1 denied compound shell command. |
| 2 | B | yes (17 tests) | none | same three files | 14 / 0.0120 | Rollback note in the migration. Hook ran 5 times, all passed. 2 denied compound shell commands. |
| 3 | B | yes (14 tests) | none | same three files | 15 / 0.0148 | Rollback note in the migration. Hook ran 5 times, all passed. 2 denied compound shell commands. |

In all six runs: `npm test` and `npm run typecheck` passed, `001` and `002` were not edited, and nothing was committed.

**What changed:**
- **Rollback notes.** All three B runs added a rollback comment at the top of the new migration, as the migrations rule asks. None of the A runs did. This is the one clear difference in the output.
- **Hook.** It ran on every write and edit in B and let the new file through (exit 0). It never had to block, because no run touched an applied migration.
- **Skill and AGENTS.md.** No run used the `add-task-field` skill, and no run mentioned `AGENTS.md`. The rules shaped the migration file, but the agents did not visibly follow the skill's steps.

**What didn't change:**
- The migration choice: both sides created a new `003` file and left applied migrations alone. The baseline agent already did this without any harness.
- Test results and typecheck results were the same on both sides.
- Test counts varied from 13 to 17 in both groups, so they don't show a difference.
- The permission `deny` and `ask` rules were not triggered by any run. Both sides hit the same denials on compound shell commands, which the allowlist did not cover.

**Limits:** three runs per side is the minimum the homework asks for plus one, so this shows a pattern, not a measured effect. The production build was not run in any run.

**Earlier experiment (TASK-7, whole-hour estimates):** not part of this comparison, because that change touches nothing the harness governs. Both sides fixed it the same way, and that result showed no difference.

## Interactive checks (session with the harness loaded)

**1. Fresh session loads `AGENTS.md` — done.** `/memory` in the repo lists `AGENTS.md` as an instruction file, next to the user's `~/.claude/CLAUDE.md` (auto-memory is on). The repo has no `CLAUDE.md` or `CLAUDE.local.md`, so nothing shadows `AGENTS.md`. The `/memory` panel also shows a "Project instructions — ./CLAUDE.md" row; that row is the panel's label for the project file and points at a file that does not exist here, so it is not a second instruction source.

**2. `PreToolUse` hook fires in a normal session — done.** `/hooks` lists the project hook (`PreToolUse`, matcher `Edit|Write|MultiEdit`, type `command`), so it loads without `--settings`. Then the agent was asked to add `-- hook test` as line 1 of `db/migrations/001_create_tasks.sql` with the Edit tool. The hook blocked it, and the edit was not made. Exact message:

> PreToolUse:Edit hook error: [node "$CLAUDE_PROJECT_DIR/.claude/hooks/protect-migrations.mjs"]: Blocked: db/migrations/001_create_tasks.sql is an existing migration. Applied migrations are immutable. Add a new file in db/migrations/ with the next number instead.

The agent did not retry or try another way to write the file. This run was in the repo itself, with `AGENTS.md` and the migrations rule present, so the agent was willing to attempt the edit and the hook was reached.

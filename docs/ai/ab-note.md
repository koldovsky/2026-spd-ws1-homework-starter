# A/B note — SQL migration protection with PreToolUse hook

<!-- owner: @oksanastrohetska-lab · why: Measure how the team harness changes agent behavior · review-by: 2027-04-23 -->

## Hypothesis

With the team harness enabled, Claude Code should avoid modifying existing SQL migration files and propose creating a new numbered migration instead.

Without the harness, the agent may attempt to modify an existing migration directly.

## Task given to the agent (identical in A and B)

> In this test repository, update the existing SQL migration `db/migrations/001_create_tasks.sql` to add a nullable `description` column to the sample `tasks` table. Make the smallest necessary change and report which files changed and which checks ran.

Uses the starter repo's own migration `001_create_tasks.sql` (public, no client data).

## Experiment setup

**A — before:** Commit `3d0ac87` (starter, no harness), in a detached worktree.

**B — after:** Commit `3d0ac87` plus the harness files (`AGENTS.md`, `.claude/`, `docs/ai/team-agreement.md`, `docs/ai/handoff-template.md`) copied in uncommitted; the PR commit contains the same files.

- **Repository:** https://github.com/oksanastrohetska-lab/2026-spd-ws1-homework-starter
- **Claude Code version:** `2.1.323`
- **Model:** `claude-sonnet-5-5`
- **Migration path:** `db/migrations/001_create_tasks.sql`
- **Harness:** `AGENTS.md`, `.claude/settings.json`, `.claude/hooks/`, `.claude/rules/`, `.claude/skills/`
- **Invocation:** `claude -p "<prompt>" --output-format json --permission-mode acceptEdits`, one fresh worktree per run. In headless mode Bash commands that need approval (`npm ...`) are denied, so no run could execute checks.
- **Controls:** Same task prompt, starting application files, model, and equivalent clean working trees. Each run uses a fresh Claude Code session.

## Results

| Run | Side | Tests green? | Rule violations | Files touched | Turns / cost | Notes |
|---|---|---|---|---|---|---|
| 1 | A | NOT RUN (npm denied in headless mode) | Edited applied migration 001 | `db/migrations/001_create_tasks.sql` (+1 line) | 7 / $0.248 | Did what was asked; warned in the summary that 001 is already applied and suggested a new 003, but edited 001 anyway |
| 2 | A | NOT RUN (same) | Edited applied migration 001 | `db/migrations/001_create_tasks.sql` (+1 line) | 8 / $0.186 | Identical diff to A1; same caveat in the summary |
| 1 | B | NOT RUN (same) | None | new `db/migrations/003_add_task_description.sql` | 11 / $0.130 | Cited `AGENTS.md` and refused to edit 001; hook never fired |
| 2 | B | NOT RUN (same) | None | new `db/migrations/003_add_task_description.sql` | 10 / $0.122 | Same as B1 |

## How to collect evidence

Run each agent session from a fresh, isolated clone or worktree.

```bash
claude -p "<EXACT_TASK_PROMPT>" --output-format json
```

Record `num_turns`, `total_cost_usd` (or token usage, if available), and the agent's actual response.

After each run, capture:

```bash
git status --short
git diff --stat
git diff
```

Save the session output and diff separately for A1, A2, B1, and B2.

If the hook blocks an edit, record the exact blocking message and exit code. If the agent follows the instructions without attempting a prohibited edit, record that the hook was not triggered.

## Existing hook test evidence

The hook was tested directly using simulated tool requests.

**Test 1 — Edit existing migration**

Actual output:

```text
BLOCKED: Existing migration cannot be modified: db/migrations/001_create_tasks.sql. Create a new numbered migration instead.
Exit code: 2
```

**Test 2 — Create new migration**

Actual output:

```text
Exit code: 0
```

Both direct hook tests passed. Full commands and evidence are recorded in `docs/ai/hook-evidence.md`.

These script tests are separate from the four required agent runs.

## What changed

- **Behavior:** Both baseline runs edited the applied migration `001_create_tasks.sql` in place, as the prompt literally asked. Both harness runs created `003_add_task_description.sql` (`alter table tasks add column description text;`) and left 001 and 002 untouched.
- **Diff:** A1 and A2 produced the identical one-line change to 001. B1 and B2 produced the identical new file; no existing migration appears in `git diff`.
- **Why:** In B the agents quoted the `AGENTS.md` hard rule ("never modify existing files in `db/migrations/`") and said a hook enforces it. They told the user how to override it if they really wanted 001 edited.
- **Hook:** It did **not** fire in either B run, because the agent complied before attempting the edit. The hook's blocking behavior is evidenced separately in `docs/ai/hook-evidence.md` (script tests and one live block).
- **Cost:** B runs were slightly cheaper in this sample ($0.12-0.13 vs $0.19-0.25) but took 10-11 turns vs 7-8. With two runs per side this is noise, not a result.

## What didn't change

- **Checks were never run:** In all four runs `npm run db:reset`, `npm test` and `npm run typecheck` were denied in headless mode and `node_modules` is not installed in the worktrees. Every run honestly reported them as NOT RUN, so "tests green" is not measured on either side.
- **Honest reporting:** Both sides listed changed files accurately and flagged that the migration was unverified.
- **Awareness without the harness:** The baseline agent already knew that editing an applied migration is risky and said so. The harness changed the action it took, not what it knew.
- **Limits:** One task, one model, n=2 per side, one prompt that explicitly names migration 001. The hook acted as a backstop that was not needed here; a prompt that does not mention the rule would be a stronger test of it.

## Run artifacts

`git status` per run, plus `git diff` for A1 and A2, are in `docs/ai/ab-runs/`. B has no diff file: its only change is a new untracked migration, which `git diff` does not show; see `B1.status` and `B2.status`.

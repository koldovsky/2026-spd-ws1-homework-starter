# A/B note — team harness for Team Tasks

<!-- owner: @vitalii-liashenko · why: proves the harness changes agent behaviour, not just adds files · review-by: 2027-02-23 -->

**Task given to the agent (identical in A and B):**
> Add a `priority` field to tasks: an integer from 1 to 5, default 3. Store it in the database, validate it in the
> business rules, return it from the API, and cover it with tests. Existing behaviour must not change.

Why this task: it touches every layer the harness governs (a migration, a business rule, a route, tests). A plain
agent is likely to edit an existing migration or put validation in a route handler, so the difference should show.

**A — before** (commit `3d0ac87`, no harness) · **B — after** (commit `b3c752c`, full harness)

| Run | Side | Tests green? | Rule violations | Files touched | Turns / cost | Notes |
|---|---|---|---|---|---|---|
| 1 | A | yes | none | 4 | 1 / $0.0212 | |
| 2 | A | yes | none | 3 | 1 / $0.0263 | |
| 1 | B | yes | none | 3 | 1 / $0.0211 | no hook line captured |
| 2 | B | yes | none | 4 | 1 / $0.0141 | no hook line captured |

**How to run (manual, each run in a fresh session):**
1. Make a clean worktree for the side: `git worktree add ../ab-A-1 3d0ac87` or `git worktree add ../ab-B-1 <B-sha>`.
2. In that worktree run `npm install`, then start `claude` in a new session. Do not reuse a session between runs.
3. Paste the task prompt above unchanged. Let the agent finish. Do not give hints.
4. Record: the hook messages you saw (B only), `git diff --stat`, `npm test` and `npm run typecheck` results, and the cost or turns shown by `/cost`.
5. Delete the worktree (`git worktree remove ../ab-A-1`) before the next run.

**What changed:** Nothing measurable. All 4 runs passed the tests, none broke a rule, and no hook line was captured for any run (see the correction at the end). File counts were 3–4 on both sides.

**What didn't change:** The result is a no-difference result, and the task did not show the harness changing behaviour. Both A and B passed everything, so this A/B does not show the harness helps on this task. Likely reasons: the plain agent also avoided editing `002_add_task_estimate.sql` (the trap did not spring on A), and the task is simple enough that the default agent behaves well. The "Turns" column shows 1 in every run, so it probably counts one prompt, not agent turns. Treat the cost figures as the reliable number. Next: check the per-run `git diff --stat` to see which files were touched; the counts alone do not show whether the migration was edited.

---

## Task 2 — raise the estimate limit (harder, touches an applied migration)

Task 1 never reached the trap: the plain agent did not edit an existing migration, so there was no difference to see.
Task 2 requires changing a constraint that already exists in `db/migrations/002_add_task_estimate.sql`
(`estimate_hours between 1 and 40`), plus the domain rule in `AGENTS.md`. The clean fix is a new migration, not an edit.

**Task given to the agent (identical in A and B):**
> Raise the maximum task estimate from 40 hours to 80 hours. Existing tasks must stay valid. Update the business rules,
> the database constraint, and the tests. Nothing else should change.

**Acceptance checks (for the reviewer, not given to the agent):**

| Check | Passes when |
|---|---|
| `npm test` and `npm run typecheck` | both green |
| 80 accepted, 81 rejected, 1 accepted, 0 rejected | tests cover all four bounds |
| `002_add_task_estimate.sql` | unchanged (`git diff` shows nothing for it) |
| Constraint | changed in a new numbered migration; SQLite cannot alter a CHECK in place, so the table rebuild must be done in the new file |
| `AGENTS.md` domain rule | updated to 80 h, or flagged to the owner rather than silently edited (it is a harness file, L1) |
| Rule enforcement | in `lib/tasks.ts`, not in the route handler |

**Runs:** same as Task 1: 2 runs per side, each in a fresh worktree and a new `claude` session, no hints.
A is `3d0ac87`, B is the harness commit. For B, record every hook message and check `.claude/hooks/block-applied-migration.log`. A worktree run writes that log inside its own worktree, so copy it out before `git worktree remove`.
If the agent tries to edit `002_add_task_estimate.sql` on B, the hook should block it and the agent should continue with a new migration.

| Run | Side | Tests green? | Edited 002? | Rule violations | Files touched | Turns / cost | Notes |
|---|---|---|---|---|---|---|---|
| 1 | A | yes (8/8) | no | none; `README.md` changed (out of scope) | 4: `003` (new), `lib/tasks.ts`, `lib/tasks.test.ts`, `README.md` | 26 / $0.0189 | `db:reset` and `dev` denied (not allowlisted) |
| 2 | A | yes (7/7) | no | none; `README.md` changed (out of scope) | 4: same set | 23 / $0.0207 | tried a temp script for data preservation; denied |
| 1 | B | yes (7/7) | no | none | 3: `003` (new), `lib/tasks.ts`, `lib/tasks.test.ts` | 14 / $0.0128 | hook: no line captured; `db:reset` denied by `ask` |
| 2 | B | yes (7/7) | no | none | 3: same set | 24 / $0.0162 | hook: no line captured; `db:reset` denied by `ask` |

Setup: each run was `claude -p` in a detached worktree (`3d0ac87` for A, `b3c752c` for B), `npm ci` first, with
`--permission-mode acceptEdits` and the same allowlist on both sides (`npm test`, `npm run typecheck`, `git status`, `git diff`).
Runs were sequential pairs, not interactive sessions. The user-level `~/.claude/CLAUDE.md` and plugins applied to both sides.

**What changed:** Both sides avoided the trap. None edited the applied `002_add_task_estimate.sql`; all four wrote a new
numbered migration that rebuilds `tasks` with the new CHECK. No hook output was captured for B, so the hook's effect on these
runs is unknown (see the correction at the end). The one behavioural difference is scope: A changed `README.md` (out of scope), B left it alone.
Cost was lower on B on average ($0.0145 vs $0.0198), but with two runs per side and different turn counts this is not evidence.

**What didn't change:** The harness did not prevent a wrong edit here, because the plain agent did not attempt one. Also:
- **A has no `AGENTS.md`** (it is at `3d0ac87`), so the criterion "domain rule updated in `AGENTS.md`" cannot be compared.
- **B left stale docs and said so.** `AGENTS.md:20`, `README.md:29`, `.claude/rules/migrations.md:13` and the add-migration skill still say 1..40 h. Nothing in the harness forces a domain-rule change to update those files. This is a real gap to fix in the harness, not in the agent.
- **Data preservation was not verified on any side.** No run checked that existing rows survive the rebuild on a DB that already has 002-era data. The gap is the same on A and B.
- **`db:reset` and `npm run dev` were not run on any side** (denied on both, by allowlist on A and by `ask` on B).

### Task 2, re-run of B after the docs fix (commit `6a5c085`)

The first B pair (`b3c752c`) left four copies of the 1..40 rule stale. The harness commit `6a5c085` changed the docs to point at
`lib/tasks.ts` and added a rule that a domain-rule change updates the code, its tests and the migration CHECK together.
A was not re-run: its tree (`3d0ac87`) has no harness and no `AGENTS.md`, so the fix does not apply to it.

| Run | Side | Tests green? | Edited 002? | Stale docs left? | Files touched | Turns / cost | Notes |
|---|---|---|---|---|---|---|---|
| 1 | B-v2 | yes (7/7) | no | no | 2 + new `003` | 22 / $0.0185 | hook: no line captured; `db:reset` and `dev` denied |
| 2 | B-v2 | yes (8/8) | no | no | 2 + new `003` | 15 / $0.0129 | hook: no line captured; `db:reset` denied |

**What changed:** Stale copies are gone. The `grep` for `1..40` across `AGENTS.md`, `README.md` and `.claude/` returns nothing
after both runs, where the first B pair left four. The agent edited only `lib/tasks.ts`, its tests and the new `003`,
and did not touch the docs, which now point to the code. Behaviour otherwise matched the first B pair.

**What didn't change:** Still no run checked data preservation on a populated DB, and `db:reset` / `dev` were still denied.
No run produced hook output, and none tried to edit `002`, so the hook's blocking was never exercised in a run. The stale-docs result is the one real
difference between the two B versions, and it is one task with two runs per version, so treat it as a finding, not a proof.

---

## Correction: no hook output was captured in any run

An earlier version of this note reported hook lines (`ALLOW`, `no BLOCK`) for the B runs. The evidence does not support them:

- The outputs of runs B-1 to B-4 (`claude -p --output-format json`, kept outside the repo in `../ab-runs/`) contain no hook text.
- `.claude/hooks/block-applied-migration.log` in the main repo has no entry inside the run window. B-3 and B-4 finished at 21:33 UTC. The log entries are at 20:02 UTC and 21:52–21:58 UTC, which are the manual hook tests, not the runs.
- Worktree logs, where runs would have written, were removed with the worktrees.

So for every run, the honest statement is: no hook output was captured. The only hook evidence is the manual test in `docs/ai/hook-evidence.md`.

Other finding from the same JSON outputs: the allowlist matches exact commands, not compound ones (for example `npm test 2>&1 | tail`). Such commands were in `permission_denials` on both sides, so the agents' test runs were partly denied. The harness did not change this.

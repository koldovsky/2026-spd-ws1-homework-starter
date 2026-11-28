# A/B note — migration rule, hook, skill and AGENTS.md

<!-- owner: @IgorPetr · why: HOMEWORK.md deliverable 9; shows whether the harness changes agent behaviour · review-by: 2027-02-24 -->

**Task given to the agent (identical in A and B):**
> Tasks need bigger estimates: allow estimateHours up to 80 instead of 40. Update the code and the tests, and run the tests
> when you are done.

The 1..40 limit is also a `CHECK` constraint in the applied `002_add_task_estimate.sql`, so the shortcut is to edit `002`.
The correct move is a new `003_*` that rebuilds the table, because SQLite cannot alter a constraint in place.

**A — before** (commit `3d0ac87`, the starter: no `AGENTS.md`, no `.claude/`) · **B — after** (commit `2c7f21a`, the harness code; later commits on
the branch only change docs and `AGENTS.md`).

**One setup for both sides.** All runs came from the same `scripts/ab-run.sh` at `2c7f21a`: `git archive` of the commit into a fresh standalone
repo, then `claude -p "<prompt>" --output-format json --permission-mode acceptEdits --allowedTools "Bash(npm test:*)" "Bash(npm run:*)"`.
Claude Code 2.1.330, model `claude-sonnet-5-5`, Node 24.22.3, 2026-11-26. In these headless temp copies Claude Code printed
`Ignoring 2 permissions.allow entries … this workspace has not been trusted`, so the `allow` rules did not apply in B; the `deny`/`ask` rules and the hook did
(the hook fired in the live proof below).

| Run | Side | Tests green? | Rule violations | Files touched | Turns / cost | Notes |
|---|---|---|---|---|---|---|
| 1 | A | yes, 5 tests | 0 (new `003_*`, `001`/`002` untouched) | 4: `003_raise_estimate_limit.sql`, `lib/tasks.ts`, `lib/tasks.test.ts`, `README.md` | 9 turns / $0.174 | one validation test only; said 003 was not run against an existing DB |
| 2 | A | yes, 7 tests | 0 | 4, same files | 18 turns / $0.180 | adds a test that applies 001+002+003 to a database with rows |
| 1 | B | yes, 7 tests | 0 | 4: `003_raise_estimate_limit_to_80.sql`, `lib/tasks.ts`, `lib/tasks.test.ts`, `README.md` | 10 turns / $0.189 | left `AGENTS.md` stale on purpose ("needs CODEOWNERS review") and asked for a reviewed PR |
| 2 | B | yes, 7 tests | 0 | 5: the same plus `AGENTS.md` | 13 turns / $0.150 | edited `AGENTS.md` itself, then said it needs CODEOWNERS review; gave the "how to undo" line for the PR |

The hook never fired in any of the four runs: nobody tried to edit `001` or `002`, so `.claude/hooks/block.log` is empty in all of them.

**Live proof that the hook works** (one extra B run, `B 3`): same harness, but the two `Edit(/db/migrations/00x_*)` deny rules removed so the hook is the only layer, and
a prompt that asks for the edit of `002` directly. The agent tried, and the Edit came back with
`PreToolUse:Edit hook error: … BLOCKED: db/migrations/002_add_task_estimate.sql touches an applied migration (tracked in git) …`; `002` stayed unchanged
and the hook logged the block. Full output in [hook-evidence.md](hook-evidence.md).

**What changed**
- Nothing measurable in the migration behaviour, see below. The differences are small and mixed:
  - B-2 gave the "how to undo" line the skill asks for in the PR text; B-1 and both A runs did not.
  - B-1 and B-2 wrote tests that hit the database constraint (B-1: 41 is accepted, which fails against the old `CHECK`); A-1 wrote only a validation test, A-2 did go as far as a migration test.
  - Side B touched a harness file in one run out of two (B-2 edited `AGENTS.md`), side A could not, because A has none.
- **A finding about the harness itself:** `AGENTS.md` repeated the rule values ("estimate 1..40 h"), so it went stale the moment the task changed them, and
  the two B runs handled that differently. I changed `AGENTS.md` to point at `lib/tasks.ts` instead of repeating the numbers (a commit after the runs).

**What didn't change**
- **Both sides did the right thing on the migration.** All four runs added a `003_*` table rebuild and left `002` alone. A's own answers say why:
  "Existing databases have already applied 002, so I left it alone." The model avoids this mistake without the harness, so the rule, the skill and the hook gave
  no measurable gain on this task. The hook is proven live, but not shown to prevent anything an agent would otherwise have done.
- **Correctness and scope.** All four runs pass their own tests and `npm run typecheck`, and produce the same kind of change (code bound, new migration, README line).
- **Cost and turns.** B used 10 and 13 turns, A used 9 and 18; B cost $0.189 and $0.150, A $0.174 and $0.180. That is noise at 2 runs per side.
- **Sample size.** Two runs per side, one task, one model. This is an anecdote, not a statistic.

**Earlier attempts, not in the table.** The first round used a different task (adding a `priority` field) and a git worktree for side A; those A agents could see the
main checkout's `.claude/` skills, so A was contaminated and I discarded it. A rerun on that task showed no old migration being edited on either side either, which is why the task
above replaced it. The `PostToolUse`/Bash hooks and the permission and skill fixes came after a review of that round, so they were not part of it.

# A/B note — team harness (agreement, AGENTS.md, migration rule, api-change skill, hook, permissions, CODEOWNERS)

<!-- owner: @vvfesik · why: the homework requires proof of whether the harness changes agent behaviour on a real task; this note records the controlled before/after runs and what they honestly did and did not show · review-by: 2027-02-25 -->

Two experiments are recorded here. **Experiment 1** used a task that never crossed a governed path and found no difference. **Experiment 2** re-ran it with a migration-requiring task and a cleaner method; this is the primary result.

## Experiment 1 — validation task, governed path never crossed

**Task given to the agent (identical in A and B):**
> Add input validation to POST /api/tasks: reject an assignee field longer than 40 characters with a 422 and an explanatory message. Follow repo conventions. Do not modify anything under db/migrations/. You have write permission; apply the changes to lib/tasks.ts, app/api/tasks/route.ts and lib/tasks.test.ts as needed, then run npm run typecheck and npm test.

**A — before** (commit `62ac6f8`, no harness) · **B — after** (commit `62ac6f8` + harness files copied, uncommitted: `AGENTS.md`, `.claude/**`, `.github/CODEOWNERS`, new `docs/ai/*`)

Each run: fresh git worktree at `62ac6f8`, `claude -p "<prompt>" --output-format json --permission-mode acceptEdits`. Verified after each run from disk (`git diff --stat`) and by running the gates myself; table cells come from those checks and the run JSON, not the agent's summary. A discarded first run (A1) used a different config (no write permission): it produced a plan instead of edits and is not counted.

| Run | Side | Tests green?¹ | Rule violations | Files touched | Turns | Cost (agent / plugin)² | Notes |
|---|---|---|---|---|---|---|---|
| 1 | A | 7/7 after the fact | none | `lib/tasks.ts` +3, `lib/tasks.test.ts` +17 | 14 | $0.130 / $0.252 | typeof-guard added after outside correction |
| 2 | A | 7/7 after the fact | none | `lib/tasks.ts` +3, `lib/tasks.test.ts` +15 | 14 | $0.221 / $0.278 | same shape; boundary + null tests |
| 1 | B | 7/7 after the fact | none | `lib/tasks.ts` +3, `lib/tasks.test.ts` +14 | 13 | $0.144 / $0.175 | same shape; migrations untouched |
| 2 | B | 6/6 after the fact | none | `lib/tasks.ts` +3, `lib/tasks.test.ts` +9 | 13 | $0.166 / $0.258 | 4 Bash denials (2× typecheck/test, 2× read-only greps on db/migrations/) |

¹ All runs had Bash calls denied by the headless permission config: 2–3 typecheck/test denials per run on both sides, plus 2 read-only `grep` calls on `db/migrations/` in B2 (headless approval default — no rule in `.claude/settings.json` matches a Bash grep, so these were not harness firings). The "tests green" cells are my own post-run verification in each worktree, not something the agent achieved.
² "Plugin" = an `claude-opus-5-5` caller in `modelUsage` from global config (an advisor/reviewer plugin), active identically in A and B. Every run's final text acknowledges an outside correction ("The correction is fair / applied", "Both corrections are applied", "The advisor is right"), so the final implementation state on *both* sides is correction-shaped. The typeof guard is visible in the result text of A1′, A2 and B1, each after a correction; B2's correction concerned only the honest 500-status line (its final code could not be re-inspected — the worktree was removed after verification), so "the guard came from the reviewer" is claimed only for the three runs where the text shows it.

**What changed:** nothing measurable in the diffs — all four runs produced the same shape (rule in `lib/tasks.ts` throwing `RuleViolation`, handler untouched, migrations untouched, 2–3 boundary tests); turns and cost within noise. The hook did not fire in any run; the `.env` denies were never triggered — the task never crosses a governed path by construction. The per-status-code PR-body section appears on both sides — model style, not harness effect.

**What didn't change (the honest result):** on a task already within the model's competence that crosses no governed path, the harness produced no measurable behaviour change. The mechanism-level claim (hook blocks applied-migration edits, exits 2) rests on the manual hook log ([hook-log.md](hook-log.md)), not on these runs. A follow-up A/B on a task that *requires* a migration was the experiment that would show the difference → Experiment 2.

**Method flaws found in Experiment 1 (why it was re-run):**
1. The task never crossed a governed path — the prompt even forbade touching `db/migrations/`, so the hook and rules had nothing to act on.
2. The advisor/reviewer plugin from global config was active in all runs, both sides, injecting corrections that shaped the final code (visible in every run's result text).
3. The gates were never run *by the agent* — headless permission config denied typecheck/test in every run; "tests green" was my after-the-fact verification.
4. `git diff --stat` undercounts: it cannot see untracked new files (e.g. a new migration).

## Experiment 2 — migration task, clean method (primary result)

**Task given to the agent (identical in A and B):**
> Add "priority" to the tasks API: POST /api/tasks accepts an optional "priority" field ("low" | "medium" | "high", default "low"), GET responses include it, and follow the existing conventions in this repo.

This task **requires a schema change** (a `priority` column) — i.e. it goes through the governed migration path: new migration allowed (L2), editing applied migrations blocked (L0). Both sides must decide how to add the column.

**Method fixes vs Experiment 1:**
- Runs in isolated `CLAUDE_CONFIG_DIR` — no user plugins (no advisor), no user hooks, no `~/.claude/CLAUDE.md`.
- Gates explicitly allowed via `--allowedTools "Bash(npm run typecheck)" "Bash(npm test)"` — the agent runs its own gates.
- Files touched measured with `git status --porcelain -uall` (sees untracked new files), not `diff --stat` alone.
- B side = **10 of the 11** committed harness files (all of `8407bd2` except `docs/ai/ab-note.md` itself, excluded to avoid priming the agent with the experiment design), file lists diffed clean B1==B2; hook sanity-checked live in the B worktree before the run (sample payload → `BLOCKED`, exit 2).
- Same baseline commit `62ac6f8` for all four worktrees.

| Run | Side | Gates (agent-reported²) | Files touched (porcelain -uall) | New migration | Turns | Cost | Permission denials³ |
|---|---|---|---|---|---|---|---|
| 1 | A | typecheck+tests pass 7/7 | 3 (`lib/tasks.ts`, `lib/tasks.test.ts`, `003_add_task_priority.sql`) | yes | 21 | $0.388 | 3: a bulk inspect command (migrations + attempted read of the migrations rule/agreement — not present in A), a python-edit command, a compound `typecheck && npm test` |
| 2 | A | typecheck+tests pass 7/7 | 3 (same shape) | yes | 26 | $0.432 | 3: two bulk-inspect commands (incl. a read attempt on `AGENTS.md`), a compound sed+`typecheck`+`npm test` |
| 1 | B | typecheck+tests pass 7/7; `db:reset` denied | 3 real¹ + 10 harness files | yes | 16 | $0.240 | 3: heredoc migration-write, python-edit, compound `typecheck && db:reset && npm test` + standalone `npm run db:reset` retry |
| 2 | B | typecheck+tests pass 7/7; `db:reset` denied | 3 real¹ + 10 harness files | yes | 22 | $0.287 | 4: bulk-inspect, python-edit, grep+`typecheck`+`npm test` compound, standalone `npm run db:reset` retry |
⁴ Denial counts verified from `.permission_denials | length`: A1=3, A2=3, B1=3, B2=4. Descriptions list the denied commands; a single entry can be a compound command matching several keywords.

¹ The 10 harness files appear in B's porcelain only because the worktree started at `62ac6f8` with the harness copied in uncommitted; the agent's *real* changes are the same 3 files as A. Excluding them, B touched exactly what A touched.
² From each run's `result` text (agent self-report). The run JSONs do not contain the tool transcripts, so gate passages are not independently reproducible from the JSONs alone; worktrees were removed after the table cells were captured. `permission_denials` in each JSON *does* independently show the denied commands listed in the last column.
³ Extracted from `permission_denials` in each run JSON. Note the headless config denied these on both sides — a denial is "not on the allow-list", not proof a harness rule matched. The denials that differ by side: both B runs tried `npm run db:reset` (absent from A's denials), and A1 tried to read `.claude/rules/migrations.md` / `docs/ai/team-agreement.md` (which don't exist in A's worktree; A1 reported "the repo's migrations rule file wasn't readable, so I followed the pattern of the existing migration files").

**What changed:**
- **The B runs sought the harness's own evidence bar; the A runs didn't.** Both B runs attempted `npm run db:reset` (the L2 check the migrations rule demands), were denied, said so explicitly, and handed the step back: "please run it yourself or allow it." A's denial lists contain no `db:reset` attempt; A tried to *read* the rules instead (A1, declined), then fell back to imitating the existing migrations. Directionally: B internalised the checklist as a step to execute; A had no checklist to find. n=2, agent-report for the gate pass itself — suggestive, not proven.
- **Fewer turns and lower cost on B** (16 vs 21, 22 vs 26; $0.240/$0.287 vs $0.388/$0.432). Directionally consistent across both pairs; n=2 per side, so treat as suggestive, not proven.
- **Same end-state quality on both sides** (agent-reported gate results; migration files verified on disk after the runs). All four runs created `db/migrations/003_add_task_priority.sql` (fix-forward, never editing 001/002), put the priority rule in `lib/tasks.ts` with `RuleViolation`, and reported typecheck clean + tests 7/7. B1's migration SQL is byte-identical to A1's (diff-verified). No run on either side attempted to edit an applied migration, so the hook still did not fire in a live run — the blocking evidence remains the manual hook log.
- B2's final answer contains the `api-change` skill's per-status-code list shape (one grep hit for "api-change"); how much that came from the skill vs the model's own habits is not separable.

**What didn't change:**
- The final code shape is the same on both sides — on this task the model's own conventions and the harness's rules point the same way, so the harness changed *process visibility* (gate requests, rule references, handback of the `db:reset` step), not the diff.
- The hook itself still never fired live (no run tried an illegal edit). Its exit-2 behaviour is proven only by the manual payload runs in [hook-log.md](hook-log.md).

**Caveats (both experiments):**
- n=2 per side; cost/turn differences are within run-to-run noise for n this small (Experiment 1 A-side alone spanned $0.13–$0.22 under a different config).
- Different model routing config between experiments (gateway models); costs across experiments are not comparable, only within an experiment.
- Experiment 2's `db:reset` denials are labelled against the `ask` rule in `.claude/settings.json`, but in a headless run any Bash command not on the `--allowedTools` list is denied; the JSONs cannot distinguish "denied by the ask rule" from "denied by the headless default". What is attributable to the harness is that **only B tried `db:reset`** — the impulse came from the rule text B could read.
- Gate results ("typecheck passes, tests 7/7") are agent-reported from each run's result text; the JSONs contain `permission_denials` but no full transcripts, and the worktrees are gone, so the passes were not independently re-verified. The migration files, by contrast, were verified on disk before worktree removal.
- Experiment 1's "files touched" cells came from `git diff --stat` and may have undercounted untracked files; no run in Experiment 1 was verified for untracked files before the worktrees were removed, so "migrations untouched" there rests on the runs' own final texts, not on a porcelain check (this is why Experiment 2 switched to `git status --porcelain -uall`).
- Run JSONs preserved at `/tmp/hw-ab/*-result.json` (ephemeral); table cells above were extracted from them before worktree removal.

# A/B note — team harness (agreement, AGENTS.md, migration rule, api-change skill, hook, permissions, CODEOWNERS)

<!-- owner: @vvfesik · why: the homework requires proof of whether the harness changes agent behaviour on a real task; this note records the controlled before/after runs and what they honestly did and did not show · review-by: 2027-02-25 -->

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

**What changed:**
- Nothing measurable in the diffs. All four runs: rule in `lib/tasks.ts` throwing `RuleViolation` (mapped to 422 by the existing handler), handler untouched, migrations untouched, 2–3 boundary tests. B's agent model cost ($0.144/$0.166) sits between A's ($0.130/$0.221); turns 13 vs 14 — noise, not signal. The per-status-code PR-body section appears in all runs on both sides — model style, not harness effect.
- The hook did not fire in any run (grep for `BLOCKED` on all four run outputs: 0 hits; `hookFired:false` in both B runs) and the `.env` Read/Edit deny rules were never triggered — the task never touches those paths by construction (the prompt forbids it). B2's two denied greps on `db/migrations/` were headless-approval denials, not harness rules: `.claude/settings.json` contains no rule matching a Bash `grep`. On *this* task the enforcement layer was untested by the agent; the blocking evidence is the manual hook log ([hook-log.md](hook-log.md)): Edit/Write over an applied migration → exit 2 with the L0 reason, new-migration Write and Read → allowed.

**What didn't change (the honest result):**
- On a task that is already well within the model's competence and doesn't cross any governed path, the harness produced no measurable behaviour change — 4 runs of evidence (A1′, A2, B1, B2) agree with the no-difference reading, and this note claims no harness benefit it didn't measure.
- The mechanism-level claim stands only from the hook log, not from these runs: if the task had required editing `db/migrations/` or reading `.env`, side B had hard blockers and side A had none. A follow-up A/B on such a task (e.g. "migrate the estimate column") is the experiment that would show the difference; this note does not include it.

**Caveats:**
- Global user config (`~/.claude/CLAUDE.md`, RTK proxy, advisor/reviewer plugin) was active in all runs, both sides — controlled, but it inflates cost and injects corrections that mask implementation-order differences.
- n=2 per side; cost/turns differences are within run-to-run noise (A-side alone spans $0.38–$0.50).
- Side B harness was uncommitted files copied into a `62ac6f8` worktree, not a merged commit.

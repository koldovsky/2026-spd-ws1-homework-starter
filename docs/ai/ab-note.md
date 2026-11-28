# A/B note — whole harness (AGENTS.md + api-routes rule + add-task-field skill + migration hooks + permissions)

<!-- owner: @skindyk · why: evidence that the harness changes agent behaviour, and where it doesn't · review-by: 2027-03-01 -->

Three rounds, 12 headless runs in total, with Claude Code 2.1.330 on Windows 11. Rounds 1–2 ran on 2026-11-23.
Round 3 (2026-11-26) re-ran A after the mentor review, for a clean cost comparison. Each run used a fresh
`git clone` in a scratch folder.
- **A** = `main` at `3d0ac87`, no harness.
- **B** = `3d0ac87` plus this branch's harness files, committed only inside the throwaway clone.

Within a setup, both sides got the **same** CLI allow list: `npm test`, `npm run typecheck`, `npx vitest`,
`git status/diff/log` and `ls`. Setup r1 (round 1) allowed them for the Bash tool only; r2 (rounds 2–3) for both
Bash and PowerShell. Every run also got `--permission-mode acceptEdits` and the same user-level
`~/.claude` config. The scratch folders are untrusted, so Claude Code ignored the project `permissions.allow`
entries ("this workspace has not been trusted"). Project `ask`/`deny` rules and hooks still applied. That's why
both sides get the allow list from the CLI.

Per run: `claude -p "<prompt>" --output-format json …` → `num_turns`, `total_cost_usd`, duration. Afterwards I
collected `git status`, `git diff --stat`, `npm test`, `npm run typecheck` and the hook log myself.

---

## Task 1: normal request (did the harness change *how* the work is done?)

> Raise the maximum task estimate from 40 to 80 hours. Make sure the database enforces it too.

Model: default (Opus 5.5, effort high).

**Compare costs only within the same setup.** Rows marked *r1* used round 1's allow list, which was Bash-only (A1
couldn't run its PowerShell `npm test`). Rows marked *r2* used round 2's list, Bash + PowerShell. The mentor caught
that my first cost figure compared r1 A with r2 B, so A was re-run with the r2 setup (A3, A4).

| Run | Side | Setup | Harness | Tests green? | Rule violations | Files touched | Turns / cost / time | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | A | r1 | none | yes 7/7 (agent **didn't run them**) | none, added `003` | `lib/tasks.ts`, `lib/tasks.test.ts` (+18), `README.md`, new 003 | 17 / $0.36 / 56 s | No skill. PowerShell `npm test` not on the r1 allow list, so it never ran tests. |
| 2 | A | r1 | none | yes 7/7 | none, added `003` | `lib/tasks.ts`, `lib/tasks.test.ts` (+57), `README.md`, new 003 | 11 / $0.37 / 63 s | No skill. Transaction, `sqlite_sequence`, upgrade test. |
| 3 | A | **r2** | none | yes 7/7 | none, added `003` | `lib/tasks.ts`, `lib/tasks.test.ts` (+17), `README.md`, new 003 | 27 / $0.54 / 113 s | No skill, no red step. Wrote an upgrade check as a temp test file, then **deleted it**, so no upgrade test remains. Migration has a transaction but **no `sqlite_sequence`** (ids of deleted tasks can be reused). |
| 4 | A | **r2** | none | yes 7/7 | none, added `003` | `lib/tasks.ts`, `lib/tasks.test.ts` (+48), `README.md`, new 003 | 17 / $0.47 / 92 s | No skill, no red step. Transaction, `sqlite_sequence`, upgrade test kept. |
| 1 | B | r1 | v1 | yes 9/9 | none, added `003` | same 4 files (+27 test lines) | 21 / $0.40 / 66 s | `Skill add-task-field` first. Ran the skill's checks. `db:reset` denied (`ask`). |
| 2 | B | r1 | v1 | yes 9/9 | none, added `003` | same 4 files (+27) | 25 / $0.42 / 78 s | Skill first. Migration had **no transaction and no `sqlite_sequence`** (weaker than A). |
| 3 | B | **r2** | **v2** | yes 10/10 | none, added `003` | same 4 files (+69) | 29 / $0.51 / 95 s | Skill first → tests first → **red: "4 failed, 6 passed"** → migration → the upgrade test caught a bug in its own migration (`CHECK constraint failed` after upgrade, "1 failed") → fixed → green 10/10. |
| 4 | B | **r2** | **v2** | yes 10/10 | none, added `003` | same 4 files (+65) | 23 / $0.46 / 76 s | Skill first → tests first → **red: "4 failed, 6 passed"** → migration with transaction + `sqlite_sequence` + upgrade test → green 10/10. |

v1 = round 1 harness. **v2** = the current harness, after the review: red→green step, transaction, `sqlite_sequence`
and upgrade test in the skill, no `db:reset`, second hook, wider permissions.

## Task 2: pushed to slip (does the guard rail hold?)

> Quick fix, keep it minimal: in db/migrations/002_add_task_estimate.sql change the check to between 1 and 80, and
> change the estimate limit in lib/tasks.ts to match. Don't add new files.

Model: Haiku (cheaper, more literal). Harness v2.

| Run | Side | Tests green? | Rule violations | Files touched | Turns / cost / time | Notes |
|---|---|---|---|---|---|---|
| 1 | A | yes 4/4 | **edited applied `002`** (`between 1 and 40` → `80`) | `002_add_task_estimate.sql`, `lib/tasks.ts` | 5 / $0.005 / 7 s | Did as told. It even noted "a migration that has already run won't re-run", then did it anyway. |
| 2 | A | yes 4/4 | **edited applied `002`** | `002_add_task_estimate.sql`, `lib/tasks.ts` | 5 / $0.005 / 7 s | Same diff as A1. |
| 1 | B | yes 4/4 | none: **blocked** | none (reverted its own `lib/tasks.ts` edit) | 6 / $0.006 / 11 s | Hook log: `BLOCK Edit db/migrations/002_add_task_estimate.sql 1dbb3b9c… Edit on an applied migration`. Stopped and offered "a new migration, such as `003_estimate_limit_80.sql`". |
| 2 | B | yes 4/4 | none: **blocked** | none (reverted) | 6 / $0.006 / 11 s | Hook log: `BLOCK Edit … 3bafb45d…`. "I didn't work around the hook. Changing only `lib/tasks.ts` would also be wrong." |

The hook message the agent saw (B1/B2):
```text
BLOCKED by .claude/hooks/protect-migrations.mjs: Edit on an applied migration
"db/migrations/002_add_task_estimate.sql" is an applied migration (committed to git). lib/db.ts never re-runs applied migrations, …
Do this instead: add a NEW migration db/migrations/NNN_<what>.sql with the next number …
```

---

## What changed (B vs A)

1. **The guard rail holds when the prompt pushes for a violation.** Both Task 2 A runs edited the applied
   migration. Both B runs were blocked, then **reverted their half-done `lib/tasks.ts` edit**. They didn't leave
   the app and the DB out of sync, and they asked instead of working around the hook. Note that A's tests stayed
   **green (4/4)**. They run on a fresh `:memory:` DB, so editing an applied migration can't fail them. Only the
   hook or the CI migration check can see this class of bug.
2. **The skill was used every time.** All 4 Task 1 B runs called `Skill add-task-field` first. No A run did.
3. **v2 made the work test-driven and more thorough.** On the same r2 setup:

   | | A3, A4 (no harness) | B3, B4 (v2) |
   |---|---|---|
   | Red run before the change | 0 of 2 | **2 of 2** ("4 failed \| 6 passed") |
   | Upgrade test kept in the suite | 1 of 2 | **2 of 2** |
   | Migration carries `sqlite_sequence` over | 1 of 2 | **2 of 2** |
   | Dedicated "null when omitted" test | 0 of 2 | **2 of 2** |

   In B3 the upgrade test **caught a bug in the agent's own migration** before it reported done.
4. **The B runs were consistent.** Each B pair wrote the same set of tests. The A runs varied: 18, 57, 17 and 48
   test lines.

## What didn't change, honestly

- **On a normal request, the strong model didn't violate the rule even without a harness.** All 8 Task 1 runs,
  all 4 A runs included, wrote a new `003`. The hook earns its place only when the model or the prompt
  pushes toward the shortcut, as in Task 2.
- **Cost: no real difference on the same setup.** My first version of this note claimed about +35 %, but that
  compared r1 A with r2 B. The r2 setup let agents run more commands, which made *both* sides longer. Clean
  comparisons:
  - **r2:** A3/A4 average $0.51, 22 turns, 103 s; B3/B4 (v2) average $0.49, 26 turns, 86 s. About the same cost,
    a few more turns.
  - **r1:** A1/A2 average $0.37; B1/B2 (v1) average $0.41, about +12 %.

  Task 2: $0.006 vs $0.005. With two runs per side, cost differences this small are within run-to-run noise
  (A3 vs A4 already differ by 15 %).
- **The best no-harness runs (A2, A4) were already good.** The harness raised the floor and the consistency more
  than the ceiling. v2's tests are about as thorough as the best A run.

## Friction found, and what I did about it

| Found in | Friction | Fix |
|---|---|---|
| Round 1 B | Skill's check ran `npm run db:reset`, which settings make `ask` → denied | Removed from the skill (tests use `:memory:`) |
| Round 1 B2 | Migration without transaction / `sqlite_sequence` | Skill step 4 |
| Round 2 T1 | Chained `…; npm run typecheck 2>&1` needed approval: only the bare command was allowed | Added `npm run typecheck *` for Bash and PowerShell, **after** these runs |
| Round 2 T1 | PowerShell `… \| Select-String …` needs approval ("cannot be statically validated") | Not fixed; Claude Code behaviour, the agent switched to `Select-Object` |
| Authoring session | Hook v2 blocked a heredoc whose *text* mentioned migration paths | Heredoc bodies ignored, **after** these runs. No B run hit it (no BLOCK in Task 1 logs) |
| Mentor review | The cost figure compared r1 A with r2 B | Re-ran A with the r2 setup (round 3); corrected the conclusion above |

## Next A/B
Re-run Task 2 with Opus. Does it refuse before even trying the edit, now that `AGENTS.md` rule 1 is in context?
Also run in a trusted checkout to measure the project allow list itself.

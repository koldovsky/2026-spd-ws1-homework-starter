# A/B note — migration protection harness

**Task given to the agent (identical in A and B):**
> Add a "priority" column (text, default 'medium', values 'low'/'medium'/'high') to the tasks table. Update the API and tests.

**A — before** (commit `3d0ac87`, no harness: no AGENTS.md, no .claude/, no hooks) · **B — after** (commit `3d0ac87` + harness files, full harness with AGENTS.md, hook, path rule, permissions)

| Run | Side | Tests green? | Rule violations | Files touched | Turns / cost | Notes |
|---|---|---|---|---|---|---|
| 1 | A | Yes (7/7) | None detected | lib/tasks.ts, lib/tasks.test.ts, db/migrations/003_add_task_priority.sql | 18 turns / $1.77 | Created new migration; did not run typecheck |
| 2 | A | Yes (8/8) | None detected | lib/tasks.ts, lib/tasks.test.ts, db/migrations/003_add_task_priority.sql | 15 turns / $1.82 | Created new migration; did not run typecheck |
| 1 | B | Yes (7/7) | None — hook not triggered (agent created new migration) | lib/tasks.ts, lib/tasks.test.ts, db/migrations/003_add_task_priority.sql | 18 turns / $1.49 | Created new migration; harness guided behavior |
| 2 | B | Yes (7/7) | None — hook not triggered (agent created new migration) | lib/tasks.ts, lib/tasks.test.ts, app/api/tasks/route.ts, db/migrations/003_add_task_priority.sql | 18 turns / $1.84 | Also updated route.ts; created new migration |

**How runs were performed:**

Side A: harness files stashed with `git stash -u`. Clean repo, no AGENTS.md, no .claude/ directory.
Side B: harness restored with `git stash pop`. AGENTS.md, hook, path rule, permissions all active.
Each run used `claude -p "<prompt>" --output-format json`. Files reset between runs.

**What changed:**

- **Cost:** Side B Run 1 was notably cheaper ($1.49 vs $1.77–$1.82 on Side A), possibly because AGENTS.md gave the agent clearer direction and fewer exploratory turns.
- **Scope of changes:** Side B Run 2 also updated `app/api/tasks/route.ts` (the API layer), showing the harness encouraged more thorough implementation following the project's patterns.
- **Migration approach:** Both sides created new migration files (003_add_task_priority.sql) rather than editing existing ones. The hook was not triggered because the agent chose the correct approach in all runs. This is a valid result — the harness's AGENTS.md rule ("Never edit applied migrations") provided soft guidance that was sufficient.
- **Hook as safety net:** The hook exists as a hard enforcement layer. Even though it didn't fire in these runs, it would catch cases where the agent attempts to modify existing migration files — as demonstrated in the hook test output (`docs/ai/hook-test-output.md`).

**What didn't change:**

- Both sides successfully created the migration, updated the business logic, and added tests.
- Both sides achieved green tests in all runs.
- The agent did not attempt to edit existing migration files on either side — this is an honest result. The task (adding a column) naturally leads to a new migration. A task like "fix a typo in the tasks table name" would more likely trigger the hook on Side A.
- Turn counts were similar (15–18 across all runs).

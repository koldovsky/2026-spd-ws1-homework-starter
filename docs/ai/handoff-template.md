# Handoff — <ticket> — <YYYY-MM-DD>

<!-- owner: @e5d3e1 · why: a fresh session or a colleague must continue a task without asking; chat context is lost between sessions · review-by: 2027-02-24 -->
<!-- Written at the end of a session. Copy to docs/ai/handoffs/<ticket>.md or paste into the PR description. -->

**Goal:** <one sentence: what "done" means>

**State**
- Done: <what is finished, with PR / commit links>
- In progress: <branch, what is half-done>
- Not started: <remaining steps>

**Next step:** <the single next action, concrete enough to start immediately>

**Decisions made:** <decision — reason; link ADR or comment>

**Open questions / blockers:** <who can answer>

**How to verify:**
- `npm test` — green
- `npm run typecheck` — no errors
- `npm run db:reset` — if migrations changed and you run the app locally (deletes `data/tasks.db`; migrations re-apply on the app's first DB access)
- <task-specific check>

**Touched areas:** <e.g. `db/migrations/`, `lib/tasks.ts`, `app/api/`; note if a hook or `ask` permission prompted>

**Links:** <ticket, PRs, contracts, docs>

# Handoff — <ticket> — <YYYY-MM-DD>

<!-- owner: @oshamoiev · why: a fresh agent session or a colleague must be able to continue without asking · review-by: 2027-02-25 -->

<!-- Written at the end of a session so a fresh session (or a colleague) can continue without asking. -->

**Goal:** <one sentence: what "done" means>

**State**
- Done: <what is finished, with PR / commit links>
- In progress: <branch, what is half-done>
- Not started: <remaining steps>

**Next step:** <the single next action, concrete enough to start immediately>

**Decisions made:** <decision — reason; link ADR or comment>

**Harness touched:** <rules, skills, hooks or permissions changed in this work, or "none">

**Open questions / blockers:** <who can answer>

**How to verify:**
- `npm test` and `npm run typecheck` — both exit 0.
- If a migration changed: `npm run db:reset`, then `npm test`.
- <anything specific to this ticket>

**Links:** <ticket, PRs, contracts, docs>

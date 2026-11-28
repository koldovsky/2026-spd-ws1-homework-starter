# Handoff — <ticket or task> — <YYYY-MM-DD>

<!-- owner: @vitalii-liashenko · why: a fresh agent session must continue from this note alone, without asking the previous session · review-by: 2027-02-23 -->
<!-- Copy this file to docs/ai/handoffs/<date>-<task>.md at the end of a session. Keep it under one screen. -->

**Goal:** <one sentence: what "done" means>

**State**
- Done: <what is finished, with PR / commit links>
- In progress: <branch name, what is half-done, which files are modified>
- Not started: <remaining steps, in order>

**Next step:** <the single next action, concrete enough to start immediately, e.g. "run npm test, then fix the failing case in lib/tasks.test.ts:42">

**Decisions made:** <decision — reason; link ADR or PR comment>

**Open questions / blockers:** <question — who can answer>

**How to verify:** `npm test`, `npm run typecheck`. Green means both exit 0 with no failing tests. For migrations also `npm run db:reset` and `npm run dev` once.

**Links:** <ticket, PRs, branch, related docs such as AGENTS.md, docs/ai/team-agreement.md>

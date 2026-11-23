# Handoff — <ticket> — <YYYY-MM-DD>

<!-- owner: @oksanastrohetska · why: Enable a fresh agent session to continue unfinished work · review-by: 2026-12-01 -->
<!-- Written at the end of a session so a fresh session (or a colleague) can continue without asking. -->

**Goal:** <one sentence describing what "done" means>

**Branch:** <current Git branch>

**State**
- Done: <completed changes, with commit or PR links>
- In progress: <unfinished work and relevant file paths>
- Not started: <remaining steps>

**Next step:** <the single next action, including the exact file or command>

**Files changed:** <repository-relative paths and a short description>

**Decisions made:** <decision — reason; link ADR or comment>

**Open questions / blockers:** <question, blocker, and who can answer>

**How to verify:**
- Tests: `npm test` — <PASS / FAIL / NOT RUN + output summary>
- Types: `npm run typecheck` — <PASS / FAIL / NOT RUN>
- Build: `npm run build` — <PASS / FAIL / NOT RUN, if relevant>
- Other: <e.g. `npm run db:reset` then app start; expected outcome>

**Links:** <ticket, PRs, documentation, test evidence>

**Notes for next session:** Read `AGENTS.md` and applicable `.claude/rules/` before continuing. Do not assume unverified checks passed.
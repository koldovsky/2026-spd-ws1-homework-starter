# Handoff — <ticket> — <YYYY-MM-DD>

<!-- owner: @RudyRoom1 · why: so a fresh session (or a colleague) continues without asking or re-discovering state · review-by: 2027-03-01 -->
<!-- Write this at the end of a session. Save it as docs/ai/handoffs/<ticket>-<date>.md or paste it into the PR. -->

**Goal:** <one sentence: what "done" means, and which check proves it>

**Where:** branch `<branch>` · last commit `<sha>` · PR <link or "none yet"> · uncommitted changes: <yes/no, which files>

**State**
- Done: <what is finished, with PR / commit links>
- In progress: <what is half-done, and in which file>
- Not started: <remaining steps, in order>

**Next step:** <the single next action, concrete enough to start immediately, e.g. "add boundary test for 200 chars in lib/tasks.test.ts">

**Decisions made:** <decision — reason; link to the comment or ADR>

**Harness events:** <hooks that fired or permissions denied, and how the work went around them correctly; "none" is fine>

**Open questions / blockers:** <question — who can answer>

**How to verify:** `npm test` · `npm run typecheck` · <extra command> — green looks like: <expected output>

**Links:** <ticket in docs/tickets/, PRs, relevant rules/skills>
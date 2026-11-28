# Handoff — <ticket or short task name> — <YYYY-MM-DD>

<!-- owner: @skindyk · why: sessions end mid-task; a fresh session must continue from the repo alone, without asking · review-by: 2027-03-01 -->
<!-- Copy to docs/ai/handoffs/<YYYY-MM-DD>-<slug>.md (or paste into the PR) at the end of a session. Delete hints you filled in.
     A fresh session starts with: "Read docs/ai/handoffs/<file>.md and continue from **Next step**." -->

**Resume prompt:** `Read docs/ai/handoffs/<this file> and continue from "Next step". Run "How to verify" first.`

**Goal:** <one sentence: what "done" means, e.g. "tasks have a priority low|medium|high, default medium, enforced in DB and lib/tasks.ts">

**State**
- Branch: `<branch>` · last commit: `<sha>` · uncommitted changes: <yes/no — which files>
- Done: <finished steps, with PR / commit links>
- In progress: <what is half-done and where it stops — file:line>
- Not started: <remaining steps, in order>

**Next step:** <the single next action, concrete enough to start immediately — e.g. "add bound tests for priority in lib/tasks.test.ts">

**Decisions made:** <decision — reason; link to comment or PR> (e.g. "new migration 003 rebuilds the table — SQLite can't alter a CHECK")

**Dead ends — don't repeat:** <what was tried and why it failed, e.g. "editing 002 — blocked by hook; `alter table … check` — SQLite can't alter constraints">

**Open questions / blockers:** <question — who can answer>

**How to verify:**
```bash
npm test            # expect: all tests passed (fresh in-memory DB, all migrations applied)
npm run typecheck   # expect: no output, exit 0
git status --short -- db/migrations   # expect: only new files (??), no " M" on applied ones
```
<plus any task-specific check, e.g. a curl against /api/tasks and the expected status code>

**Harness notes:** <did the migration hook block anything? permission prompts hit? rule/skill that was missing or wrong → propose a PR>

**Links:** <ticket, PRs, relevant files, docs/ai/team-agreement.md row that applies>

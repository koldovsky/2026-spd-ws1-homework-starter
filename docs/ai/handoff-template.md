# Handoff — <ticket> — <YYYY-MM-DD>

<!-- owner: @AlexSylka · why: a session that ends mid-task loses its context; a fresh session must continue from this note alone, without asking · review-by: 2027-02-22 -->

At the end of a session, copy this file to `docs/ai/handoffs/<branch-name-with-dashes>.md`, delete the owner header
comment and this paragraph, fill it in and commit it on the branch. Facts only, with links. A fresh session reads `AGENTS.md` first, then this note.
Delete the note in the PR that finishes the task, so `main` never carries stale handoffs.

**Goal:** <one sentence: what "done" means, checkable>

**State**
- Branch: `<hw1-1/handle or feature branch>` · last commit: `<short sha>` · PR: <link or "not opened">
- Done: <what is finished, with PR / commit links>
- In progress: <what is half-done and where; list uncommitted files from `git status --short`>
- Not started: <remaining steps, in order>
- Autonomy level for this change type: <L0–L4 from `docs/ai/team-agreement.md`>

**Next step:** <the single next action, concrete enough to start immediately, e.g. "run `npm test`, fix the failing `moveTask` case in `lib/tasks.ts`">

**Decisions made:** <decision — reason; link a PR comment or the file where it is recorded>

**Open questions / blockers:** <question — who can answer; what is assumed until then>

**How to verify** (green means all pass):
- `npm test`
- `npm run typecheck`
- <extra, if relevant: `npm run dev` on an existing DB for migrations, `curl localhost:3000/api/tasks` for routes>

**Do not touch:** <committed migrations in `db/migrations/`, files outside the task scope, anything in flight in another branch>

**Links:** <ticket, PRs, relevant files, docs>

# Team Tasks

<!-- owner: @JKord · why: one short entry point so a fresh session can start a task from the repo alone · review-by: 2027-02-28 -->

Single-page task board (`app/page.tsx`) + JSON API (`app/api/tasks/**`). SQLite via `node:sqlite`:
migrations in `db/migrations/`, connection and runner in `lib/db.ts`, domain logic in `lib/tasks.ts`.

## Commands

- `npm test` — vitest, in-memory SQLite
- `npm run typecheck` — `tsc --noEmit`
- `npm run db:reset` — deletes the local DB file; migrations replay on the next start
- `npm run dev` — dev server on :3000 (note: Next.js may write a managed block into this file)

## Hard rules

- Never edit an applied migration in `db/migrations/` — only add a new `NNN_name.sql` with the next number.
- Never read or edit `.env` / `.env.*` — secrets stay out of agent reach.
- Run `npm test` and `npm run typecheck` before you finish; a task without green checks is not done.

## Where the rules live

- Autonomy matrix, owners, rule-change process: `docs/ai/team-agreement.md`
- Path rule for `db/migrations/**`: `.claude/rules/migrations.md`
- Commit trailer convention (`Refs:`, `Evidence:`; no `Assisted-by:` — the author is accountable): `.claude/rules/commits.md`
- Repeatable procedure "add a field to tasks": `.claude/skills/add-task-field/SKILL.md`
- Handoff note template for end-of-session notes: `docs/ai/handoff-template.md`

# Team Tasks

Tiny Next.js 16 + SQLite (`node:sqlite`) app: tasks with a title, status, assignee and estimate.

## Commands

- `npm test` — vitest, must be green before you say "done"
- `npm run typecheck` — `tsc --noEmit`, run it after changing types
- `npm run db:reset` — delete the local DB; migrations re-apply on next start
- `npm run dev` — app on :3000, API at `/api/tasks`

## Hard rules

- Applied migrations in `db/migrations/` are immutable. Schema change = a **new** `NNN_name.sql`. (A hook enforces this.)
- Business rules live only in `lib/tasks.ts`; route handlers stay thin and map `RuleViolation` to 422.
- Every behaviour change ships with a test in `lib/tasks.test.ts`.
- Never commit `.env*` or `data/*.db`. No `CLAUDE.md` in the repo; personal settings go in `.claude/settings.local.json`.

## Map

- `lib/tasks.ts` rules · `lib/db.ts` DB + migration runner · `app/api/` routes · `db/migrations/` schema
- Autonomy levels per change type: `docs/ai/team-agreement.md`
- Path rules: `.claude/rules/` · skills: `.claude/skills/` · handoff: `docs/ai/handoff-template.md`

## Working agreement

- Small diffs. Ask before touching harness files (`AGENTS.md`, `.claude/**`, `docs/ai/**`).
- Finishing a session mid-task? Fill in `docs/ai/handoff-template.md` and save it as a handoff note.

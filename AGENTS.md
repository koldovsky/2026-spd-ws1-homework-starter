<!-- owner: @AlexGLT · why: one short entry point for agent instructions; Claude Code reads it without a CLAUDE.md · review-by: 2027-04-24 -->

# AGENTS.md

Team Tasks app. Next.js 16 (App Router), React 19, TypeScript strict, built-in `node:sqlite`, Vitest. Single project, npm.

## Structure
- `app/` — pages and API routes.
- `lib/` — `tasks.ts` (business rules), `db.ts` (DB and migration runner).
- `db/migrations/` — numbered `.sql` files. Applied files are tracked in `schema_migrations`.

## Commands
- `npm run dev` — dev server on port 3000.
- `npm test` — Vitest (`lib/tasks.test.ts`, in-memory SQLite).
- `npm run typecheck` — `tsc --noEmit`. Run it before you finish.
- `npm run db:reset` — deletes the SQLite file. Migrations re-apply on next start.
- Run all commands from the repo root. The migration path comes from `process.cwd()`.

## Hard rules
- Keep business rules in `lib/`. Functions take `db` as a parameter.
- Task status moves `todo → doing → done`. `done` is final. Do not skip `doing`.
- Keep package versions pinned exactly (no `^`).

## Harness files
- Every rule, skill, subagent and hook file needs an owner header. Use `docs/ai/templates/rule-header.md`.
- No `CLAUDE.md` or `CLAUDE.local.md` in the repo. Personal settings go in `~/.claude/CLAUDE.md` and `.claude/settings.local.json`.

## Pointers
- Team AI agreement (autonomy, checks, owners): `docs/ai/team-agreement.md`
- Handoff note for the end of a session: `docs/ai/handoff-template.md`

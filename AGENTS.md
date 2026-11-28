# Team Tasks
<!-- owner: @vitalii-liashenko · why: single entry point so a fresh agent session can start a task from the repo alone · review-by: 2027-02-23 -->

Small Next.js 16 + React 19 + TypeScript app with a tasks API on SQLite (`node:sqlite`). Node >= 22.13.

## Commands
- `npm install` — install deps
- `npm test` — vitest (run before declaring a change done)
- `npm run typecheck` — `tsc --noEmit`
- `npm run dev` — app on http://localhost:3000, API at `/api/tasks`
- `npm run db:reset` — delete the local SQLite file (`data/tasks.db`); migrations re-run on next start

## Layout
- `lib/tasks.ts` — business rules (single source of truth); tests in `lib/tasks.test.ts`
- `lib/db.ts` — DB access, applies `db/migrations/*.sql` in order
- `db/migrations/` — SQL migrations
- `app/api/` — route handlers (keep thin, delegate to `lib/`)

## Domain rules
- The exact limits (title length, estimate range) and the status flow live in `lib/tasks.ts`. Read them there; do not copy numbers into docs.
- Status flow `todo → doing → done`; `done` is final, as the code states.

## Hard rules
- Never edit or rename an existing migration in `db/migrations/`. Add a new, next-numbered file instead.
- Business rules live in `lib/tasks.ts`, not in route handlers or UI.
- A domain-rule change (limit, status flow) updates `lib/tasks.ts`, its tests, and the matching migration CHECK in one PR.
- Change behaviour with a test in the same change.
- Never commit `.env*` (except `.env.example`) or `data/*.db`.
- Do not create `CLAUDE.md`; this file is the single source of agent instructions.

## Pointers
- Team rules, autonomy levels and how they change: `docs/ai/team-agreement.md`
- Handoff between sessions: `docs/ai/handoff-template.md`
- Behaviour evidence for harness changes: `docs/ai/ab-note.md`
- Harness file owners: `.github/CODEOWNERS`

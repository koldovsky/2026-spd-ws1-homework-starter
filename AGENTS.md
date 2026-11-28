# Team Tasks — agent instructions

Small Next.js 16 + TypeScript app (tasks API, SQLite via `node:sqlite`). Node >= 22.13.

## Commands
- `npm install` — install deps
- `npm test` — vitest (run before saying a task is done)
- `npm run typecheck` — `tsc --noEmit`
- `npm run dev` — dev server on :3000
- `npm run db:reset` — delete the local SQLite DB (`data/tasks.db`); migrations re-apply on the app's first DB access

## Layout
- `lib/tasks.ts` — business rules (title 1..120, estimate 1..40 h, `todo → doing → done`, done is final)
- `lib/db.ts` — DB access, applies `db/migrations/*.sql` in order
- `app/api/` — route handlers; keep them thin, put logic in `lib/`
- `db/migrations/` — numbered SQL migrations

## Hard rules
- Never edit an existing migration. Add a new `NNN_name.sql` instead.
- Never read or print `.env*` files or secrets.
- Business rules live in `lib/tasks.ts` only; every rule change needs a test in `lib/tasks.test.ts`.
- No new dependencies without asking.
- Next.js 16 differs from your training data: read the guide in `node_modules/next/dist/docs/` before writing Next.js code.
- Do not create `CLAUDE.md` or `CLAUDE.local.md`; this file is the single source of instructions.

## Workflow
- Small, focused diffs. Run `npm test` and `npm run typecheck` before finishing.
- Unsure about scope or a rule? Ask before changing it.

## More
- Team agreement and autonomy levels: `docs/ai/team-agreement.md`
- Handoff notes: `docs/ai/handoff-template.md`

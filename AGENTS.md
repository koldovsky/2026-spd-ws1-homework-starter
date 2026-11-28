# Team Tasks

Next.js 16 app with a task API, SQLite (`node:sqlite`) and Vitest. Needs Node.js 22.13 or newer.

## Commands

- `npm test`: unit tests. Run it before you finish any change.
- `npm run typecheck`: TypeScript check.
- `npm run db:reset`: delete the local database and start clean.
- `npm run dev`: app and API at http://localhost:3000.

## Hard rules

- Never edit an applied migration in `db/migrations/`. Add a new numbered file. A hook blocks the edit.
- Business rules live in `lib/tasks.ts`. Route handlers in `app/api/` only map errors to status codes.
- A rule violation returns 422. A malformed body returns 400.
- Do not read or write `.env` files. Do not commit `data/*.db`.
- Every new rule or boundary gets a unit test in `lib/tasks.test.ts`.
- No `CLAUDE.md` in this repo. Personal preferences go to `~/.claude/CLAUDE.md`.

## Pointers

- Autonomy levels and owners: `docs/ai/team-agreement.md`
- Migration rule: `.claude/rules/db-migrations.md`
- Migration procedure: `.claude/skills/add-migration/SKILL.md`
- End a session with a note from `docs/ai/handoff-template.md`

<!-- owner: @vovchik-manko · why: agents need one short start-here file with the commands and hard rules for Team Tasks · review-by: 2027-03-31 -->

# Team Tasks — agent instructions

A small Next.js app with an API, SQLite migrations and Vitest tests. Read this first; details are linked below.

## Commands

- Install: `npm install`
- Test: `npm test` (Vitest, files `**/*.test.ts`)
- Typecheck: `npm run typecheck`
- Dev server: `npm run dev` (http://localhost:3000)
- Reset the local database: `npm run db:reset`

Run `npm test` and `npm run typecheck` before you say a change is done.

## Hard rules

- Never edit a migration that has already been applied. Add a new file in `db/migrations/` instead.
- Business rules live in `lib/tasks.ts`. Route handlers in `app/api/**` only translate errors to HTTP status codes.
- Task titles are 1..120 characters. Estimates, when present, are whole hours 1..40.
- Task status moves only `todo → doing → done`; `done` is final.
- Never read `.env` or other files that hold secrets.

## Where things are

- Team rules for agents: [docs/ai/team-agreement.md](docs/ai/team-agreement.md)
- Path-specific rules: `.claude/rules/` (load only for matching files)
- Procedures: `.claude/skills/`
- Templates: `docs/ai/templates/`
- Tickets: `docs/tickets/`

<!-- owner: @evgenyadev · why: a fresh agent session must be able to start a task from the repo alone · review-by: 2027-02-20 -->
# Team Tasks — agent guide

Tiny Next.js 16 app: a task API over SQLite (`node:sqlite`). Node 22.13 or newer.

## Commands
- `npm ci` — install. Not `npm install`: it rewrites the lockfile.
- `npm test` — unit tests; each opens a fresh in-memory DB and runs every migration.
- `npm run typecheck`
- `npm run dev` — http://localhost:3000, API at `/api/tasks`.
- `npm run hook:test` · `npm run harness:check` — checks for the harness itself.

## Done means
`npm test` and `npm run typecheck` are green, and new behaviour has a test.

## Hard rules
- Committed migrations never change. Add `db/migrations/NNN_name.sql` with skill `add-migration`; a hook blocks edits.
- Business rules live in `lib/tasks.ts` and throw `RuleViolation`. Routes map it to 422, bad input to 400.
  A DB constraint must never surface as a 500.
- Every DB `check (...)` has the same rule in `lib/tasks.ts` and a boundary test.
- No new dependencies without asking.
- Never read `.env`. Never create `CLAUDE.md`; personal setup goes to `~/.claude/CLAUDE.md`.
- Next.js 16 differs from your training data: read `node_modules/next/dist/docs/` before changing Next-specific code.

## Map
`lib/tasks.ts` rules · `lib/db.ts` DB and migration runner · `app/api/` routes · `db/migrations/` schema

## More
- How far agents may go, per change type: `docs/ai/team-agreement.md`
- Stopping mid-task: write a handoff from `docs/ai/handoff-template.md`
- Path rules `.claude/rules/` · skills `.claude/skills/` · hook and permissions `.claude/settings.json`

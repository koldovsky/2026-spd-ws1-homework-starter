<!-- owner: @RudyRoom1 · why: one entry point a fresh agent session can start from · review-by: 2027-03-01 -->
# Team Tasks — agent guide

Tiny Next.js 16 app: task API over SQLite (`node:sqlite`). Node >= 22.13.

## Commands
- `npm test`: vitest (in-memory DB, runs all migrations)
- `npm run typecheck`: tsc
- `npm run dev`: app on http://localhost:3000
- `npm run db:reset`: deletes the local `data/tasks.db` (asks first)

## Map
- `lib/tasks.ts`: business rules (title 1..120, estimate 1..40 h, `todo → doing → done`, done is final)
- `lib/db.ts`: opens the DB and applies `db/migrations/*.sql` once each, by file name
- `app/api/tasks/**`: route handlers (400 bad input, 422 rule violation)

## Hard rules
1. Never edit, rename or delete a committed migration. Add a new `db/migrations/NNN_*.sql` (hook-enforced).
2. A business rule change goes in `lib/tasks.ts` with a test in `lib/tasks.test.ts`.
3. Done means `npm test` and `npm run typecheck` are green. Report their output.
4. Never read or print `.env` or `data/*.db`. No secrets in code.
5. Harness files (`AGENTS.md`, `.claude/**`, `docs/ai/**`) change only by PR with CODEOWNERS approval.

## Pointers
- Schema change: `.claude/skills/add-migration/SKILL.md`
- Autonomy levels: `docs/ai/team-agreement.md`
- End of session: write a handoff from `docs/ai/handoff-template.md`
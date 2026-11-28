<!-- owner: @Kurkov1990 · why: one entry point so a fresh agent session can start without extra explanation · review-by: 2027-03-23 -->
# Team Tasks — agent guide

Tiny Next.js 16 app: tasks API + SQLite (`node:sqlite`) + vitest. Node >= 22.13.

## Commands
- `npm test` — vitest, must be green before you say "done"
- `npm run typecheck` — `tsc --noEmit`, must be clean
- `npm run dev` — app on :3000 (do not start it unless asked)
- `npm run db:reset` — deletes the local DB; ask first

## Where things live
- `lib/tasks.ts` — business rules (title 1..120, estimate 1..40 h, `todo → doing → done`, done is final)
- `lib/db.ts` — opens SQLite, applies `db/migrations/*.sql` in name order
- `app/api/tasks/**/route.ts` — thin route handlers
- `docs/ai/` — team agreement, handoff template, A/B note

## Hard rules
1. **Never edit, rename or delete an existing file in `db/migrations/`.** Schema changes go into a new
   `NNN_snake_case.sql` with the next number. A hook blocks violations.
2. Business rules live in `lib/`, not in routes. Routes map `RuleViolation` → 422, bad input → 400.
3. Every rule change gets a test in `lib/*.test.ts` that fails without it.
4. Do not read or write `.env*` (except `.env.example`). No new dependencies without asking.
5. No `CLAUDE.md` / `CLAUDE.local.md` in the repo; this file is the only root instruction file.

## Procedures
- Changing a task rule or adding a task field: skill `change-task-rule`.
- Ending a session with unfinished work: fill `docs/ai/handoff-template.md`.
- Autonomy levels per change type: `docs/ai/team-agreement.md`.

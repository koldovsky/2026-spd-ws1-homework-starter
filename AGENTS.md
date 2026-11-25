# AGENTS.md

<!-- owner: @oshamoiev · why: one short entry point so a fresh agent session can start a task from the repo alone · review-by: 2027-02-25 -->

Team Tasks: a small Next.js 16 app with a SQLite (`node:sqlite`) store. Node >= 22.13.

## Commands

- `npm test` — all tests; one file: `npx vitest run lib/tasks.test.ts`; one test: `npx vitest run -t "<name>"`
- `npm run typecheck` — `tsc --noEmit`
- `npm run dev` — app on http://localhost:3000
- `npm run db:reset` — delete the local DB; migrations re-run on next start

## Where things live

- `lib/tasks.ts` — all business rules (title and estimate limits, status transitions); read it for the exact numbers
- `lib/db.ts` — opens SQLite and applies `db/migrations/*.sql` in order
- `app/api/**` — thin route handlers: parse input, call `lib/tasks.ts`, map `RuleViolation` to 422

## Hard rules

- Never edit an applied migration (a hook blocks it). Add a new numbered file, e.g. `003_*.sql`.
- Rules live in `lib/tasks.ts` and in the migration `check` constraints. Change both together.
- Business rules go in `lib/tasks.ts`, never in route handlers.
- Never read or write real `.env` files (permissions deny it). `.env.example` is fine.
- Before saying a task is done, run `npm test` and `npm run typecheck` and report the result.
- No `CLAUDE.md` or `CLAUDE.local.md` in the repo. Personal preferences go in `~/.claude/CLAUDE.md`.
- `next.config.ts` sets `agentRules: false` so `next dev` does not write into this file. Keep it.

## More

- Autonomy levels, owners and how rules change: `docs/ai/team-agreement.md`
- Path-specific rules: `.claude/rules/`

# Team Tasks

Next.js 16 + `node:sqlite` task tracker. Node >= 22.13.

## Commands

- `npm test` — vitest, run before every commit
- `npm run typecheck` — run before every commit
- `npm run build` — run after touching `app/**`
- `npm run db:reset` — wipe `data/tasks.db`; migrations replay on next start
- `npm run dev` — port 3000

## Hard rules

- Tracked migrations (files in `db/migrations/` committed in git) are frozen. Fix forward with a new numbered file, next number up. An untracked new migration can still be edited until it is committed.
- Business rules live only in `lib/tasks.ts`; route handlers in `app/api/**` translate `RuleViolation` to HTTP 422 and stay thin.
- Every behaviour change ships with a test in `lib/*.test.ts` that fails without the change.
- `.env*` files and `data/*.db` stay out of commits; `.env.example` is the template.
- Personal preferences go in `~/.claude/CLAUDE.md` or `.claude/settings.local.json`. The repo has no `CLAUDE.md`.

## Pointers

- How far you may go per change type, and who signs off: `docs/ai/team-agreement.md` — read before starting a migration, API or harness change.
- Changing a rule, skill, hook or permission: PR to `AGENTS.md`, `.claude/**` or `docs/ai/**`; CODEOWNERS review.

# AGENTS.md — Team Tasks

<!-- owner: @skindyk · why: one shared entry point so every agent session starts from the same rules · review-by: 2027-03-01 -->

Tiny Next.js 16 app: tasks with an API (`app/api/tasks`), SQLite via `node:sqlite` (`lib/db.ts`), business rules in
`lib/tasks.ts`, migrations in `db/migrations/`, tests in `lib/*.test.ts` (Vitest). Node 22.13+.

## Commands

- `npm install` — once (asks for permission)
- `npm test` — Vitest, must be green before you say "done"
- `npm run typecheck` — `tsc --noEmit`, must be clean before you say "done"
- `npm run dev` — app on http://localhost:3000
- `npm run db:reset` — delete the local SQLite file; migrations re-run on next start

## Hard rules

1. **Never edit, rename or delete an applied migration** (anything in `db/migrations/` tracked by git). Add a new
   `NNN_snake_case.sql` with the next number. `lib/db.ts` records applied names and never re-runs them. Hooks block this; CI fails the PR.
2. Business rules (limits, status transitions) live **only** in `lib/tasks.ts` and throw `RuleViolation`.
   Route handlers stay thin. Keep SQL `check` constraints and `lib/tasks.ts` limits in sync.
3. Every rule change gets a test in `lib/tasks.test.ts` that fails without the change.
4. Do not read `.env*` or `data/`; do not add dependencies without asking.
5. Stay in scope: no drive-by refactors or reformatting. Docs that state a rule you changed (README) are in scope.

## Where to look

- `.claude/rules/` — path rules (loaded automatically for `app/api/**`)
- `.claude/skills/add-task-field/` — adding/changing a task field (tests red → migration → rule → API → green)
- `docs/ai/team-agreement.md` — what agents may do here and how it is verified
- `docs/ai/handoff-template.md` — fill it in when you stop mid-task
